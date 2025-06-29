# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with a production-ready server (or use a multi-stage build with Nginx)
# For development purposes with Vite, we'll use a simpler setup.
# The `nginx` service will handle serving static files in a real production deployment.
# This Dockerfile is for the development environment orchestrated by Docker Compose.
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
# The --host flag is crucial for making the dev server accessible within the Docker network
CMD ["npm", "run", "dev", "--", "--host"]


