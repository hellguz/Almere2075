# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Create a non-root user and group
RUN addgroup --system app && adduser --system --group app

# Copy the requirements file and install dependencies
COPY ./requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code into the container
# and set correct permissions for the new user
COPY . /app
RUN chown -R app:app /app

# Switch to the non-root user
USER app

# MODIFIED: Command to run the application is now a shell command
# This allows running the startup script first, then the main server.
# This is a robust way to handle pre-start tasks like migrations and data backfilling.
CMD ["sh", "-c", "python startup.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"]