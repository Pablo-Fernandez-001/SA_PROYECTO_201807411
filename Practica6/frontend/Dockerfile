FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY ./frontend/package*.json ./
RUN npm install

# Copy application source code
COPY ./frontend/src ./src
COPY ./frontend/index.html ./
COPY ./frontend/vite.config.js ./
COPY ./frontend/postcss.config.js ./
COPY ./frontend/tailwind.config.js ./

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]