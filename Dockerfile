# Use the Node.js 18 image as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json into the working directory
COPY package*.json ./

# Install dependencies and use the --legacy-peer-deps flag
RUN npm install --force

# Copy the rest of the application code into the working directory
COPY . .

# Build the application
RUN npm run build

# Expose the port the application will run on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
