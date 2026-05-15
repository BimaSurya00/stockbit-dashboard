# Build stage
FROM node:22-alpine AS build-stage

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
# Copy nginx configuration
COPY ./docker/nginx /etc/nginx/conf.d

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]