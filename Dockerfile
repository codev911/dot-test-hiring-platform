# Build a production image for the NestJS app
FROM node:24-alpine AS base
WORKDIR /app

# Only install production deps in final image, but build needs dev deps
FROM base AS deps
COPY package.json yarn.lock ./
# Enable Yarn classic via Corepack (already bundled with Node 24)
RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && yarn --version \
  && yarn install --frozen-lockfile

FROM deps AS build
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src
COPY .env.example ./
RUN yarn build

FROM base AS runner
ENV NODE_ENV=development
WORKDIR /app

# Copy only what we need to run
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY dist ./dist

EXPOSE 3000
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js -d dist/database/typeorm.database.js migration:run && node dist/database/seeds/seed-owner.js && node dist/main.js"]
