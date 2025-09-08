
# Use official Nginx Alpine image
FROM nginx:alpine
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy a simple nginx config
COPY nginx.conf /etc/nginx/conf.d/
# Copy static website
COPY . /usr/share/nginx/html
