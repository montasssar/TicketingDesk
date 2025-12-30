# Base image
FROM node:22-alpine

# Working directory
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build the app
RUN yarn build

# Expose App port
EXPOSE 3000

# Start command
CMD ["yarn", "start"]
