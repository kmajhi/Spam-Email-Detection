"""
Django settings for the Spam Email Detection backend.
"""

import sys
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent  # repo root, contains the `ml` package

load_dotenv(BASE_DIR / ".env")

# Make the top-level `ml` package importable (ml/src/predict.py, etc.) so the
# exact same code that trained/persisted the model is used to unpickle and
# run it -- see detector/ml_service.py.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# --- Core / security -------------------------------------------------------

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-secret-key-change-me")

DEBUG = os.environ.get("DJANGO_DEBUG", "True").strip().lower() in ("1", "true", "yes")

ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

# Render sets this automatically for the deployed service -- add it so the app
# works out of the box without having to know the hostname in advance.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
    CSRF_TRUSTED_ORIGINS = [f"https://{RENDER_EXTERNAL_HOSTNAME}"]

# --- Applications ------------------------------------------------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'detector',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'spamdetector.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'spamdetector.wsgi.application'

# --- Database (SQLite; only used for Django's built-in admin/auth tables --
# this project has no application models of its own, predictions are
# stateless request/response, nothing spam-related is persisted) -----------

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'  # collectstatic target: Django admin/DRF static files
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Serve the built React app (frontend/dist) directly, at the site root, via
# WhiteNoise -- this is a separate mechanism from STATIC_URL/STATIC_ROOT above
# (which only handles Django's own admin/DRF assets). Requires `npm run build`
# to have been run in frontend/ first. Falls back to Django's default 404/DRF
# behavior at "/" if the frontend hasn't been built (e.g. fresh clone before
# `npm install && npm run build`).
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
if FRONTEND_DIST.exists():
    WHITENOISE_ROOT = FRONTEND_DIST
    WHITENOISE_INDEX_FILE = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- CORS (React dev server) ------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get(
        "DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]

# --- Django REST Framework --------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.AnonRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {'anon': '60/min'},
    'EXCEPTION_HANDLER': 'detector.exceptions.spam_api_exception_handler',
    # No login/session feature exists anywhere in this app -- these endpoints
    # are deliberately public. DRF's default SessionAuthentication would still
    # enforce CSRF on every POST regardless (Django's AnonymousUser.is_active
    # is True, so SessionAuthentication treats every anonymous request as an
    # authenticated session to CSRF-check), which broke POST /api/predict/
    # whenever the frontend and API share an origin (i.e. in production).
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}

# --- ML model artifact -------------------------------------------------------

ML_MODEL_PATH = PROJECT_ROOT / "ml" / "models" / "spam_classifier.joblib"
ML_METRICS_PATH = PROJECT_ROOT / "ml" / "models" / "metrics.json"
