FROM debian:bookworm-slim

ARG SUPERMEMORY_VERSION=server-v0.0.5
ARG SUPERMEMORY_BINARY=supermemory-server-linux-x64

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL \
    "https://github.com/supermemoryai/supermemory/releases/download/${SUPERMEMORY_VERSION}/${SUPERMEMORY_BINARY}" \
    -o /usr/local/bin/supermemory-server \
    && chmod +x /usr/local/bin/supermemory-server

EXPOSE 6767

ENTRYPOINT ["supermemory-server"]
