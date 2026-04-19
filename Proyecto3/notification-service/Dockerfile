FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package.json and install dependencies
COPY ./notification-service/package*.json ./
RUN npm install --only=production

# Copy application source code
COPY ./notification-service/src ./src

RUN mkdir -p logs

EXPOSE 3005

CMD ["node", "src/index.js"]
