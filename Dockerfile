FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Fix permissions for node_modules/.bin so ng is executable (after all files are copied)
RUN chmod -R 755 node_modules/.bin
RUN rm -rf dist
RUN npm run build

EXPOSE 80
CMD ["node", "dist/my-first-azure-web-app-v1.43/server/server.mjs"]
