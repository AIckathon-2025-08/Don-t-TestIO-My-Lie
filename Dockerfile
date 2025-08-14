FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* /app/
# build deps for native modules like better-sqlite3
RUN apk add --no-cache python3 make g++ \
  && (npm ci --quiet || npm install --quiet)

COPY . /app

EXPOSE 3000

CMD ["npm", "start"]
