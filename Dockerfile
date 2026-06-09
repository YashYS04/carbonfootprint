# Use the official lightweight Node.js 20 slim image
FROM node:20-slim

# Define environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install production dependencies only (ignores devDependencies like Jest/Supertest)
RUN npm ci --only=production --quiet

# Copy the rest of the application files
COPY . .

# Ensure the app runs as the non-root 'node' user for enhanced container security
USER node

# Inform Docker that the container listens on port 8080 at runtime
EXPOSE 8080

# Launch the Express application
CMD [ "node", "server.js" ]
