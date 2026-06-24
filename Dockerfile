# Use Node.js LTS (version 20 is more current and compatible with devDeps)
FROM node:20-alpine

# Install Chromium for Puppeteer (if actually used at runtime by the server)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chrome, we're using Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files and patches (for patch-package)
COPY package*.json ./
COPY patches/ patches/

# Install ALL dependencies (including devDependencies needed for the frontend build)
# postinstall will run patch-package, applying the steam-web HTTPS fix
RUN npm ci

# Copy application code
COPY . .

# Run the frontend build process
# This will generate the 'dist' folder
RUN npm run build:frontend

# Remove development dependencies to keep the final production image small
RUN npm prune --production

# Expose port
EXPOSE 3000

# Health check
# IMPORTANT: The /api/health endpoint is not implemented.
# Changing to check the root route "/" as an example.
# Consider implementing a proper /api/health endpoint in your app.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { console.log('STATUS: ' + res.statusCode); process.exit(res.statusCode === 200 ? 0 : 1); })"

# Run the app using the 'start' script defined in package.json
CMD ["npm", "start"]
