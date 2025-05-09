FROM node:22-alpine
WORKDIR /app
# Copiamos los archivos de configuración y dependencias
COPY package*.json ./
RUN npm install
# Copiamos el resto del código
COPY . .
EXPOSE 3000
# Iniciamos la aplicación (ajusta el comando si es necesario)
CMD ["npm", "start"]
