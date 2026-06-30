import logging

from core.config import get_settings

setting = get_settings()

def setup_logging():
    logging.basicConfig(
        level = logging.DEBUG if setting.DEBUG else logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%H:%M:%S"
    )

    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger("passlib").setLevel(logging.WARNING)
    