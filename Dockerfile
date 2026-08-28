FROM node:22-slim

RUN npm i -g pnpm@10.4.1

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build
RUN npx drizzle-kit push

EXPOSE 3000

CMD ["node", "dist/index.js"]
