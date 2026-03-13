FROM node:18-slim

WORKDIR /app

ENV PRISMA_CLIENT_ENGINE_TYPE=binary
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

COPY prisma ./prisma

RUN npm install

COPY . .

RUN npx prisma generate --schema prisma/schema.prisma

EXPOSE 3006

ENTRYPOINT ["sh", "./docker/entrypoint.sh"]
CMD ["npm", "run", "dev"]