# Stage 1: build the static app
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The cache mount keeps downloaded packages between builds, so a retry after a
# network drop resumes instead of starting over; the retry flags ride out short
# drops on slow connections.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY . .
RUN npm run build

# Stage 2: serve it. The "unprivileged" image runs as a non-root user and
# listens on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY .nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
