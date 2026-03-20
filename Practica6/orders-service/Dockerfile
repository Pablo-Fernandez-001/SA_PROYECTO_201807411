FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package.json and install dependencies
COPY ./orders-service/package*.json ./
RUN npm install --only=production

# Copy protobuf files (needed for gRPC client)
COPY ./protos ./protos

# Copy application source code
COPY ./orders-service/src ./src

RUN mkdir -p logs

EXPOSE 3003

CMD ["node", "src/index.js"]
