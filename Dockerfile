FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Set environment variables
ENV NODE_ENV=production
ENV DOCKER_BUILD=1
ENV SKIP_PREFLIGHT_CHECK=true
ENV CI=true
ENV DISABLE_AUTH=true
ENV REACT_APP_DISABLE_AUTH=true
ENV REACT_APP_WDS_SOCKET_PORT=0
ENV BABEL_ENV=production

# Copy npm and Babel configs first
COPY .npmrc package*.json .babelrc babel.config.js ./

# Install dependencies with specific versions to avoid deprecation warnings
RUN npm install --no-package-lock \
    @babel/core@7.23.7 \
    @babel/runtime@7.23.7 \
    @babel/plugin-transform-private-property-in-object@7.23.4 \
    @babel/plugin-transform-class-properties@7.23.3 \
    @babel/plugin-transform-private-methods@7.23.3 \
    babel-preset-react-app@10.0.1 \
    rimraf@5.0.5 \
    typescript@4.9.5

# Now install remaining dependencies
RUN npm install --ignore-scripts && \
    npm install -g typescript@4.9.5 rimraf@5.0.5

# Copy configuration files
COPY tsconfig*.json ./
COPY .eslintrc.json ./
COPY .prettierrc.js ./

# Copy source code and public assets
COPY src ./src
COPY public ./public

# Create empty .env file if none exists
RUN touch .env

# Clean and build
RUN rimraf dist build && \
    DISABLE_ESLINT_PLUGIN=true SKIP_PREFLIGHT_CHECK=true BABEL_ENV=production npm run build && \
    npm run build:server

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install SSH client for remote execution
RUN apk add --no-cache openssh-client

# Set environment variables
ENV NODE_ENV=production
ENV DOCKER_BUILD=1
ENV DISABLE_AUTH=true
ENV REACT_APP_DISABLE_AUTH=true

# Copy npm config and package files
COPY .npmrc package*.json ./

# Install only production dependencies
RUN npm install --ignore-scripts --omit=dev --omit=optional

# Copy built files
COPY --from=builder /app/build ./build
COPY --from=builder /app/dist ./dist

# Create SSH directory with proper permissions
RUN mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

# Create empty .env file if none exists
RUN touch .env

# Expose port
EXPOSE 4000

# Start unified application
CMD ["npm", "start"]
