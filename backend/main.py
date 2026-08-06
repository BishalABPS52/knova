from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from core.logging import setup_logging, get_logger
from ml.loader import models

setting = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm-load the recommender artifacts so the first /feed request isn't slow.
    models.load()
    # Warm up the Redis pool at boot; failures just trip the cache's circuit
    # breaker, so the API still serves from the DB until Redis recovers.
    from core.cache import init_redis

    await init_redis()

    # Establish DB connections at boot (the DB is WAN-hosted, so the first
    # connect can cost seconds; warm it so the first request isn't slow).
    await _warm_db()
    yield


_WARM_DB_CONNECTIONS = 4


async def _warm_db() -> None:
    import asyncio

    from sqlalchemy import text

    from src.db.session import AsyncSessionLocal

    async def _ping() -> None:
        async with AsyncSessionLocal() as db:
            await db.execute(text("select 1"))

    # Concurrently, so each session checks out a *different* pooled connection —
    # sequential pings would reuse the first one and warm nothing else.
    results = await asyncio.gather(
        *(_ping() for _ in range(_WARM_DB_CONNECTIONS)), return_exceptions=True
    )
    for exc in (r for r in results if isinstance(r, BaseException)):
        logger.warning("db warm-up failed: %s", exc)


app = FastAPI(
    title = "Knova",
    debug = setting.DEBUG,
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    lifespan=lifespan,
)
setup_logging()
logger = get_logger(__name__)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=setting.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base_router = APIRouter(prefix="/api/v1")

@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <html>
        <head>
            <title>Knova</title>
        </head>
        <body style="font-family:Arial;text-align:center;margin-top:100px;">
            <h1 style="color:#7393B3;">Knova</h1>
            <h3 style="color:#B2BEB5;">Telemetry Driven Educational Content Recommendation Engine</h3>
            <div>
                <a href="/api/v1/docs"><button style="border-radius:10px; box-shadow:2px 3px rgba(100,100,100,125); margin-right:20px;">API Docs</button></a>
                <a href="/api/v1/health"><button style="border-radius:10px; box-shadow: 2px 3px rgba(100,100,100,125)">Check health</button></a>
            </div>
            </div>
        </body>
    </html>
    """


@base_router.get("/health")
async def health_check():
    # Go through the cache helpers rather than the raw client: they already
    # handle "Redis disabled or cooling down" (returning None) and route any
    # failure through the circuit breaker, so health probes can't log a
    # confusing AttributeError or bypass the breaker.
    from core.cache import cache_get, cache_set

    await cache_set("health", "Ok", 900)
    cache_health = await cache_get("health")

    return {
        "state": "Running...",
        "cache": "Healthy" if cache_health else "Unhealthy"
    }
        
    
from src.auth.router import router as auth_router
from src.onboarding.route import router as onboarding_router
from src.reference.router import router as ref_router
from src.users.router import router as users_router
from src.posts.router import router as posts_router
from src.recommendation.router import router as feed_router
from src.quiz.router import router as quiz_router
from src.telemetry.router import router as telemetry_router

base_router.include_router(auth_router, prefix="/auth")
base_router.include_router(onboarding_router)
base_router.include_router(ref_router, prefix="/reference")
base_router.include_router(quiz_router, prefix="/quiz")
base_router.include_router(users_router, prefix="/users")
base_router.include_router(telemetry_router, prefix="/interactions")
# Feed router must be registered before the posts router so /posts/feed matches
# before the /posts/{post_id} catch-all.
base_router.include_router(feed_router, prefix="/posts")
base_router.include_router(posts_router, prefix="/posts")
app.include_router(base_router)