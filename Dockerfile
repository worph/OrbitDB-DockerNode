# Stage 1: Build the application
FROM node:20 as builder

WORKDIR /app

# Copy package.json and yarn.lock (or package-lock.json if using npm)
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the necessary files for building the application
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN yarn run build

# Run tests (optional)
#COPY jest.config.mjs ./
#COPY .env ./
#RUN yarn test

# Stage 2: Setup the production environment
FROM node:20

ENV PORT 4001
EXPOSE 4001

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production

# Copy any other files required at runtime (if any)
COPY dockflow.json ./

CMD ["node", "dist/"]
