# Stage 1: Build the site (Node.js)
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files first (for better caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN pnpm build

# Stage 2: Serve with Nginx (The "Enterprise" layer)
FROM nginx:alpine

# Copy the built website from Stage 1 to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy your custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]