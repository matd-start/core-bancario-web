# Imagen de la SPA (ADR-0022): compila con Node y sirve el resultado estático con nginx sin privilegios (puerto 8080).
# nginx aplica la CSP y reenvía /bff/ y /api/ al BFF (infra/nginx/default.conf).
FROM node:24-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY infra/nginx/encabezados.conf /etc/nginx/snippets/encabezados.conf
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 8080
