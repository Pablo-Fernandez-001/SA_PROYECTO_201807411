FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY payment-service/package*.json ./
RUN npm install --production

COPY payment-service/src ./src

EXPOSE 3006

CMD ["node", "src/index.js"]
