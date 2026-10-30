# Build only the Fengchao frontend; retain the official FileCodeBox backend.
ARG NODE_IMAGE=node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85
ARG OFFICIAL_IMAGE=lanol/filecodebox:2.8.5@sha256:f9186d44437004544f15bbaf784415895779a36ae3f5eb32d23886af8053bf7d

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/index.html frontend/env.d.ts frontend/tsconfig*.json frontend/vite.config.ts frontend/tailwind.config.js frontend/postcss.config.js ./
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/
COPY frontend/scripts/ ./scripts/
ARG VCS_REF=unknown
ARG APP_VERSION=2.8.5
ARG VITE_API_BASE_URL_PROD=
RUN VITE_GIT_COMMIT="$VCS_REF" VITE_APP_VERSION="$APP_VERSION" VITE_API_BASE_URL_PROD="$VITE_API_BASE_URL_PROD" npm run build

FROM ${OFFICIAL_IMAGE}
ARG OFFICIAL_IMAGE
ARG VCS_REF=unknown
LABEL org.opencontainers.image.base.name="${OFFICIAL_IMAGE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.filecodebox.frontend-fengchao-revision="${VCS_REF}"

# Patch known dependency issues without changing the official backend source.
COPY requirements.lock.txt /tmp/filecodebox-requirements.lock.txt
RUN apt-get update \
 && apt-get upgrade -y --no-install-recommends \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir --require-hashes --only-binary=:all: -r /tmp/filecodebox-requirements.lock.txt \
 && rm /tmp/filecodebox-requirements.lock.txt

COPY --from=frontend-builder /build/themes/fengchao/ /app/themes/fengchao/
# Register the separately named theme; keep 2023/2024 and existing data settings.
COPY fengchao.py docker/start.sh /app/
ENV APP_ENV="production" LOG_LEVEL="warning" ACCESS_LOG="false" \
    TIMEOUT_KEEP_ALIVE=5 MALLOC_TRIM_THRESHOLD_=65536
CMD ["sh", "/app/start.sh"]
