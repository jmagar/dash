FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssh-client

# Set production mode and build configuration
ENV NODE_ENV=production
ENV SKIP_PREFLIGHT_CHECK=true
ENV CI=true
ENV REACT_APP_DISABLE_AUTH=true
ENV REACT_APP_WDS_SOCKET_PORT=0
ENV BABEL_ENV=production

# Copy npm and Babel configs first
COPY .npmrc package*.json .babelrc babel.config.js ./

# Install Babel and its plugins first
RUN npm install --no-package-lock \
    @babel/core@7.23.7 \
    @babel/runtime@7.23.7 \
    @babel/plugin-proposal-private-property-in-object@7.21.11 \
    @babel/plugin-transform-private-property-in-object@7.23.4 \
    @babel/plugin-proposal-class-properties@7.18.6 \
    @babel/plugin-proposal-private-methods@7.18.6 \
    babel-preset-react-app@10.0.1

# Now install all dependencies
RUN npm install && \
    npm install -g typescript rimraf

# Verify critical dependencies are installed correctly
RUN echo "Verifying Babel dependencies..." && \
    npm list @babel/core && \
    npm list @babel/plugin-proposal-private-property-in-object && \
    npm list @babel/plugin-transform-private-property-in-object && \
    npm list @babel/plugin-proposal-class-properties && \
    npm list @babel/plugin-proposal-private-methods && \
    npm list babel-preset-react-app && \
    echo "Babel configuration files:" && \
    ls -la .babelrc babel.config.js

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

# Set production mode
ENV NODE_ENV=production
ENV REACT_APP_DISABLE_AUTH=true

# Copy npm config and package files
COPY .npmrc package*.json ./

# Install only production dependencies
RUN npm ci --only=production --no-optional || \
    npm install --only=production --no-optional

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
