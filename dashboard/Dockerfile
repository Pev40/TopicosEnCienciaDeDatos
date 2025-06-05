# Etapa de construcción
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependencias necesarias para SQLite y wget
RUN apk add --no-cache sqlite wget

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine AS runner

WORKDIR /app

# Instalar dependencias necesarias para SQLite y wget
RUN apk add --no-cache sqlite wget

# Copiar archivos necesarios desde la etapa de construcción
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib

# Hacer el script de inicialización ejecutable
RUN chmod +x ./scripts/init-db.sh

# Exponer el puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["./scripts/init-db.sh"] 