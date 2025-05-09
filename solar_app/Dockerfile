# Etapa 1: Construcción de la aplicación Angular/Ionic
FROM node:22-alpine as build
WORKDIR /app
# Copiamos los archivos de configuración
COPY package*.json ./
RUN npm install
# Copiamos el resto del código fuente
COPY . .
# Compilamos la aplicación (ajusta el comando según tu proyecto)
RUN npm run build --prod

# Etapa 2: Servir la aplicación con nginx
FROM nginx:alpine

# Copiamos nuestra configuración personalizada
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos compilados al directorio que usa nginx para servir contenido *******
COPY --from=build /app/www /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
