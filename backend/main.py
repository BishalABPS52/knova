from fastapi import FastAPI
from fastapi.responses import HTMLResponse

from core.config import get_settings

setting = get_settings()

app = FastAPI(
    title = "Knova",
    debug = setting.DEBUG
)


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
                <a href="/docs"><button style="border-radius:10px; box-shadow:2px 3px rgba(100,100,100,125); margin-right:20px;">API Docs</button></a>
                <a href="/health"><button style="border-radius:10px; box-shadow: 2px 3px rgba(100,100,100,125)">Check health</button></a>
            </div>
            </div>
        </body>
    </html>
    """


@app.get("/health")
def health_check():
    return {
        "state": "Running..."
    }