# Usar imagem oficial do Node.js (18 é uma versão estável)
FROM node:18-alpine

# Definir diretório de trabalho para a pasta backend
WORKDIR /app/backend

# Copiar package.json e package-lock.json (se tiver)
COPY backend/package*.json ./

# Instalar dependências do backend
RUN npm install

# Copiar o restante dos arquivos do backend
COPY backend/ .

# Expor a porta que seu backend usa (por exemplo 3000)
EXPOSE 3000

# Comando para iniciar seu servidor
CMD ["npm", "start"]
