FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY src/prisma ./src/prisma/

RUN npm install

COPY . .

RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8010

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
