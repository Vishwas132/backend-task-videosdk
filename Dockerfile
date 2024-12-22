FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies including devDependencies
COPY package*.json ./
RUN npm install

# Add nodemon globally
RUN npm install -g nodemon

# The source code will be mounted as a volume in docker-compose.yml
# This is just for documentation
COPY . .

# Set environment variables
ENV NODE_ENV=development

# Expose port
EXPOSE 3000

# Start the application with nodemon for hot reloading
CMD ["nodemon", "--legacy-watch", "src/server.js"]
