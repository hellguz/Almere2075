# --- STAGE 1: Build the React Application ---
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the static production files
# Vite will automatically use the VITE_API_BASE_URL from the .env file if present,
# otherwise it will fall back to what's in the code.
RUN npm run build


# --- STAGE 2: Serve the built assets with Nginx ---
FROM nginx:alpine

# Copy the built static files from the 'builder' stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 to the Docker network
EXPOSE 80

# The default Nginx command will start the server
CMD ["nginx", "-g", "daemon off;"]



