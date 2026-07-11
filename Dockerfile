# Single-service production image: builds the Vite client and the Express
# server from this npm-workspaces monorepo, then runs the server, which also
# serves the built client as static files (see server/src/app.ts). Intended
# for Railway - see DEPLOY.md.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

FROM deps AS client-build
WORKDIR /app
COPY client ./client
# Left unset so the client calls the API via a relative path (same origin) -
# the correct default for this single-service deployment. See DEPLOY.md.
ARG VITE_API_URL=""
ARG VITE_SENTRY_DSN=""
ARG VITE_SENTRY_ENVIRONMENT=""
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
RUN npm run build --workspace client

FROM deps AS server-build
WORKDIR /app
COPY server ./server
WORKDIR /app/server
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev

FROM node:22-slim AS runtime
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app/server

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/prisma ./prisma
COPY server/package.json server/prisma.config.ts ./
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Apply pending migrations, then start the server (which also registers the
# pg-boss job workers in-process - see server/src/index.ts).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
