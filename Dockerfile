# Use Node.js for build
FROM node:20 AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install dotenv --force && npm ci --force
RUN npm install -g @nestjs/cli

# Copy the rest of the app
COPY . .

# Build the application
RUN npm run build

# Final production image
FROM node:20

WORKDIR /app

# Copy everything from the build stage
COPY --from=build /app /app

RUN npm install -g pm2

EXPOSE 3002

CMD ["npm", "run", "start:dev"]
