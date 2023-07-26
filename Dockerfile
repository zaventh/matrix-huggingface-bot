# syntax=docker/dockerfile:1.3
ARG BUILD_VER=18
FROM node:${BUILD_VER}-slim AS builder

ENV APPDIR /usr/local/app
WORKDIR ${APPDIR}
COPY . ${APPDIR}/

RUN \
    --mount=type=cache,target=/usr/local/share/.cache/yarn/v6,sharing=locked \
    yarn install --frozen-lockfile && \
    yarn build


FROM node:18-slim AS release
ENV APPDIR /usr/local/app
WORKDIR $APPDIR
COPY --from=builder $APPDIR/package.json $APPDIR/yarn.lock $APPDIR/dist ./

RUN \
    --mount=type=cache,target=/usr/local/share/.cache/yarn/v6,sharing=locked \
    yarn install --frozen-lockfile --production


VOLUME /storage
ENV DATA_PATH="/storage"

ENV NODE_ENV "production"

CMD ["node", "index.js"]

