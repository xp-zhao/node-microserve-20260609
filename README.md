# Node.js 微服务脚手架

基于纯 TypeScript + Node.js 的微服务脚手架，用于团队内部标准化开发流程。

## 技术栈

| 项目 | 选型 |
|------|------|
| 语言 | TypeScript (严格模式) |
| 框架 | Fastify |
| 通信 | REST API |
| 部署 | Docker + Docker Compose |
| 日志 | Pino |
| 测试 | Vitest |
| 代码规范 | ESLint + Prettier + Husky |

## 项目结构

```
├── services/
│   ├── gateway/           # API 网关服务 (端口 3000)
│   └── user-service/      # 用户服务示例 (端口 3001)
├── packages/
│   └── shared/            # 共享模块 (类型、工具、日志)
├── docker-compose.yml     # 生产环境配置
├── docker-compose.dev.yml # 开发环境配置 (热重载)
└── docs/plans/            # 设计文档
```

## 快速开始

### 前置条件

- Node.js >= 20.0.0
- Docker & Docker Compose
- pnpm / npm / yarn

### 开发环境

```bash
# 启动开发环境 (支持热重载)
npm run dev

# 查看日志
npm run logs

# 停止服务
npm run stop
```

### 生产环境

```bash
# 启动生产环境
npm run start

# 停止服务
npm run stop
```

### 本地开发 (不使用 Docker)

```bash
# 安装依赖
cd packages/shared && npm install && npm run build
cd ../../services/gateway && npm install
cd ../user-service && npm install

# 启动服务 (需要在两个终端分别运行)
cd services/user-service && npm run dev
cd services/gateway && npm run dev
```

## API 端点

### Gateway (http://localhost:3000)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | / | 服务信息 |
| GET | /health | 健康检查 |
| * | /api/users/* | 代理到用户服务 |

### User Service (http://localhost:3000/api/users)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users | 获取用户列表 |
| GET | /api/users/:id | 获取单个用户 |
| POST | /api/users | 创建用户 |
| PUT | /api/users/:id | 更新用户 |
| DELETE | /api/users/:id | 删除用户 |

### 示例请求

```bash
# 获取用户列表
curl http://localhost:3000/api/users

# 创建用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'

# 获取单个用户
curl http://localhost:3000/api/users/1

# 更新用户
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'

# 删除用户
curl -X DELETE http://localhost:3000/api/users/1
```

## 开发命令

```bash
# 代码检查
npm run lint

# 代码格式化
npm run format

# 运行测试
npm test

# 测试监听模式
npm run test:watch
```

## 添加新服务

1. 复制 `services/user-service` 目录
2. 修改 `package.json` 中的服务名和端口
3. 在 `docker-compose.yml` 和 `docker-compose.dev.yml` 中添加新服务配置
4. 在 `services/gateway/src/routes/proxy.ts` 中添加路由代理配置

## 统一响应格式

```json
// 成功
{
  "code": 0,
  "data": { ... },
  "message": "success",
  "requestId": "abc-123"
}

// 失败
{
  "code": 10001,
  "data": null,
  "message": "User not found",
  "requestId": "abc-123"
}
```

## 环境变量

参考 `.env.example` 文件配置环境变量。

## License

MIT
