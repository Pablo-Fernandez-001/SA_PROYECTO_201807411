FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package.json and install dependencies
COPY ./api-gateway/package*.json ./
RUN npm install --only=production

# Copy protobuf files
COPY ./protos ./protos

# Copy application source code  
COPY ./api-gateway/src ./src

RUN mkdir -p logs

EXPOSE 8080

CMD ["node", "src/index.js"]