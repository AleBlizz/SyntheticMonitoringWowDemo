# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (use ci for reliable builds)
RUN npm ci

# Copy the rest of your application code
COPY . .

# Expose the port your Express app runs on (e.g., 3000)
EXPOSE 3000

# Command to run your app
CMD ["node", "app.edot.js"]