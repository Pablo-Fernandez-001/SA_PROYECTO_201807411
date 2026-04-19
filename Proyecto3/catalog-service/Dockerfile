FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package.json and install dependencies
COPY ./catalog-service/package*.json ./
RUN npm install --only=production

# Copy protobuf files (needed for gRPC server)
COPY ./protos ./protos

# Copy application source code
COPY ./catalog-service/src ./src

RUN mkdir -p logs

EXPOSE 3002
EXPOSE 50052

CMD ["node", "src/index.js"]
