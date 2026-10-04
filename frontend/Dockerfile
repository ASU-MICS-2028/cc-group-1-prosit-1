# Stage 1: build the static app
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve it. The "unprivileged" image runs as a non-root user and
# listens on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY .nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
