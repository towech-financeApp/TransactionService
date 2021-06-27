# Base stage ------------------------------------------------------------------------
FROM node:16-alpine3.13 as base
WORKDIR /usr/app
COPY package*.json ./

# Dev stage -------------------------------------------------------------------------
FROM base as dev
RUN npm install
COPY . .
CMD npm run dev

# Build stage -----------------------------------------------------------------------
FROM base as builder
RUN npm ci
COPY . .
RUN npm run build

# PROD stage ------------------------------------------------------------------------
FROM base as prod
RUN npm ci --production

COPY --from=builder /usr/app/dist ./dist
CMD node dist/index.js
