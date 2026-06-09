# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制共享模块
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/

# 复制网关服务
COPY services/gateway/package.json ./services/gateway/
COPY services/gateway/src ./services/gateway/src
COPY services/gateway/tsconfig.json ./services/gateway/

# 复制根配置
COPY tsconfig.base.json ./

# 安装依赖并构建共享模块
WORKDIR /app/packages/shared
RUN npm install && npm run build

# 安装依赖并构建网关服务
WORKDIR /app/services/gateway
RUN npm install && npm run build

# 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

COPY --from=builder /app/services/gateway/dist ./services/gateway/dist
COPY --from=builder /app/services/gateway/package.json ./services/gateway/
COPY --from=builder /app/services/gateway/node_modules ./services/gateway/node_modules

WORKDIR /app/services/gateway

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
