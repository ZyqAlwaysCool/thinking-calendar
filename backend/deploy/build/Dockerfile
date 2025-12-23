ARG REGISTRY=swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library
FROM ${REGISTRY}/golang:1.24.9-alpine AS builder
RUN set -eux && sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

WORKDIR /data/app
COPY .. /data/app

ENV GOPROXY=https://goproxy.cn,direct
ENV CGO_ENABLED=0

RUN rm -rf /data/app/bin/
RUN go mod download
RUN go build -ldflags="-s -w" -o ./bin/server ./cmd/server
RUN go build -ldflags="-s -w" -o ./bin/migrate ./cmd/migration
RUN go build -ldflags="-s -w" -o ./bin/task ./cmd/task
RUN mv config /data/app/bin/

FROM ${REGISTRY}/alpine:3.18
RUN set -eux && sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

RUN apk add tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

ARG APP_ENV=prod
ENV APP_ENV=${APP_ENV}

WORKDIR /data/app
COPY --from=builder /data/app/bin /data/app

EXPOSE 8998
ENTRYPOINT [ "./server" ]
