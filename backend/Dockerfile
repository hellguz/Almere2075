# backend/Dockerfile

# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install system dependencies required by the 'sharp' library for image processing
RUN apk add --no-cache vips-dev build-base

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Your app binds to port 3000
EXPOSE 3000

# Define the command to run your app
CMD [ "npm", "start" ]

