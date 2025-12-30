# Base image
FROM node:22-alpine

# Working directory
WORKDIR /app

# Install dependencies (only production if possible, but we need build too)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN yarn build

# Expose API port
EXPOSE 4000

# Start command
CMD ["node", "dist/main"]
