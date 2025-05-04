FROM node:20-alpine

WORKDIR /app

# Install necessary tools for the entrypoint script
RUN apk add --no-cache netcat-openbsd

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the source code
COPY . .

# Make the entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port that the application will run on
EXPOSE 5000

# # Set the entrypoint script
# ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start the application
CMD ["npm", "run", "start"]