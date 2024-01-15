import os

from .base import *


CANONICAL_ROOT_DOMAIN = "cubari.moe"
SECURE_HSTS_SECONDS = 60
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 3600
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "ALLOW"

DEBUG = False

ALLOWED_HOSTS = [
    "cubari.moe",
    "www.cubari.moe",
    "kaguya.cubari.moe",
    "www.kaguya.cubari.moe",
    "ka.cubari.moe",
    "www.ka.cubari.moe",
    "ice.cubari.moe",
    "www.ice.cubari.moe",
    "baka.cubari.moe",
    "www.baka.cubari.moe",
    "trash.cubari.moe",
    "www.trash.cubari.moe",
    "dog.cubari.moe",
    "www.dog.cubari.moe",
    "kuu.cubari.moe",
    "www.kuu.cubari.moe",
    "localhost",
]

CANONICAL_SITE_NAME = "cubari.moe"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s [%(name)s:%(lineno)s] %(module)s %(process)d %(thread)d %(message)s"
        }
    },
    "handlers": {
        "file": {
            "level": "ERROR",
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "verbose",
            "filename": os.path.join(PARENT_DIR, "cubarimoe.log"),
            "maxBytes": 1024 * 1024 * 100,  # 100 mb
        }
    },
    "loggers": {
        "django": {"handlers": ["file"], "level": "WARNING", "propagate": True,},
    },
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.memcached.MemcachedCache",
        "LOCATION": "127.0.0.1:11211",
    }
}

# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql_psycopg2",
#         "NAME": os.environ.get("DB_NAME"),
#         "USER": os.environ.get("DB_USER"),
#         "PASSWORD": os.environ.get("DB_PASS"),
#         "HOST": "localhost",
#         "PORT": "",
#     }
# }

OCR_SCRIPT_PATH = os.path.join(PARENT_DIR, "ocr_tool.sh")

METRICS_ENDPOINT = "https://obs.f-ck.me/ingest"
