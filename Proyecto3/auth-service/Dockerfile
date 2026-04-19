FROM node:18-alpine

# Install netcat for health checks
RUN apk add --no-cache netcat-openbsd

WORKDIR /app

# Copy package.json and install dependencies
COPY ./auth-service/package*.json ./
RUN npm install --only=production

# Copy protobuf files
COPY ./protos ./protos

# Copy application source code
COPY ./auth-service/src ./src

RUN mkdir -p logs

EXPOSE 50051

# Start the application
CMD ["node", "src/index.js"]