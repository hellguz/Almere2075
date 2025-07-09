# Gunicorn configuration file for development

# Server socket
bind = "0.0.0.0:8000"

# Worker processes
workers = 8
worker_class = "uvicorn.workers.UvicornWorker"

# Enable hot-reloading
reload = True

# Directories to exclude from hot-reloading.
# This is CRITICAL to prevent the startup.py image compression
# script from triggering an endless restart loop.
reload_excludes = ["*/images/*", "*/thumbnails/*"]