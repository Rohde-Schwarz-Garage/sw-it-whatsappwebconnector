# Build the application
FROM node:23-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm i

COPY src ./src
RUN npm run build

# Run the application
FROM node:23-bookworm-slim AS run

WORKDIR /run

RUN apt update
RUN apt install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/build ./build
ENTRYPOINT [ "npm", "run", "prod" ]