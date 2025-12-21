FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend .

# Copy Contracts folder so we can deploy/read artifacts
COPY contracts /contracts

# Install Hardhat in contracts for deployment script
WORKDIR /contracts
RUN npm install

WORKDIR /app

EXPOSE 3001

CMD ["node", "server.js"]
