# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制共享模块
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/

# 复制用户服务
COPY services/user-service/package.json ./services/user-service/
COPY services/user-service/src ./services/user-service/src
COPY services/user-service/tsconfig.json ./services/user-service/

# 复制根配置
COPY tsconfig.base.json ./

# 安装依赖并构建共享模块
WORKDIR /app/packages/shared
RUN npm install && npm run build

# 安装依赖并构建用户服务
WORKDIR /app/services/user-service
RUN npm install && npm run build

# 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

COPY --from=builder /app/services/user-service/dist ./services/user-service/dist
COPY --from=builder /app/services/user-service/package.json ./services/user-service/
COPY --from=builder /app/services/user-service/node_modules ./services/user-service/node_modules

WORKDIR /app/services/user-service

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]
