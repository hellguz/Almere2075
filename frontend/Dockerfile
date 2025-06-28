# frontend/Dockerfile

FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run the Vite development server
# The --host flag is crucial for making it accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]