FROM node:20-alpine

WORKDIR /app

# Copy root and tracker dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and tracker script
COPY src/ ./src/
COPY ../tracker/ ../tracker/
COPY ../demo-site/ ../demo-site/

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "src/server.js"]
