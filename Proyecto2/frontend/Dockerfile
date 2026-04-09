# ETAPA 1: Build de la aplicación
FROM node:18-alpine as build
WORKDIR /app
# Copiamos archivos de dependencias
COPY ./frontend/package*.json ./
RUN npm install
# Copiamos todo el código y generamos los archivos estáticos
COPY ./frontend/ ./
RUN npm run build

# ETAPA 2: Servidor Nginx para producción
FROM nginx:stable-alpine
# Copiamos la carpeta 'dist' (donde Vite guarda el build) a Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Configuración de Nginx para el puerto 8080 y React Router
RUN echo 'server { listen 8080; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]