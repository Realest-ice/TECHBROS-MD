# Use a lightweight Node.js LTS image based on the latest stable OS
FROM node:20-alpine

# Install system dependencies needed for media processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    webp-dev

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Command to run the bot when the container starts
CMD [ "npm", "start" ]
