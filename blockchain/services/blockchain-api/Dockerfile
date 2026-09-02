FROM node:18-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Wallet, CA material, and connection profile are mounted as volumes at
# runtime (see docker-compose.yml) rather than baked into the image —
# they're per-environment and gitignored for a reason.
VOLUME ["/app/wallet", "/app/ca", "/app/config", "/app/storage"]

EXPOSE 4000

CMD ["node", "src/index.js"]
