# 用户请求完整生命周期：从进入到响应

## 一、项目架构概览

本项目是一个基于 **Node.js + TypeScript + Fastify** 的微服务脚手架，采用 **API 网关 + 业务服务** 的两层架构，通过 Docker Compose 编排部署。

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network                           │
│                                                                 │
│  ┌──────────────┐         ┌──────────────────┐                 │
│  │   Gateway    │  HTTP   │   User Service    │                 │
│  │  :3000       │ ──────► │   :3001           │                 │
│  │  (API 网关)  │         │   (用户业务服务)   │                 │
│  └──────────────┘         └──────────────────┘                 │
│                                                                 │
│  ┌──────────────────────────────────────────┐                   │
│  │         @scaffold/shared (共享包)         │                   │
│  │  - 类型定义 (ApiResponse, ErrorCode)      │                   │
│  │  - 错误类 (BizError)                     │                   │
│  │  - 工具函数 (sendSuccess, createLogger)   │                   │
│  └──────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### 服务组成

| 服务 | 端口 | 职责 |
|------|------|------|
| **Gateway** | 3000 | API 网关，负责请求路由转发、请求 ID 注入、请求/响应日志、全局错误兜底 |
| **User Service** | 3001 | 用户业务服务，负责用户 CRUD、参数校验、业务逻辑、业务错误抛出 |
| **@scaffold/shared** | - | 共享包，提供统一类型、错误码、日志、响应工具 |

---

## 二、请求完整流程图

以 `GET /api/users/1` 为例，展示一个请求从进入到响应的完整过程：

```
客户端 (Client)
    │
    │  HTTP GET /api/users/1
    ▼
┌─────────────────────── Gateway (Fastify, :3000) ───────────────────────┐
│                                                                         │
│  ① onRequest Hook: requestIdMiddleware                                  │
│     ├─ 检查请求头 x-request-id                                          │
│     ├─ 若存在 → 复用该 ID                                               │
│     └─ 若不存在 → 生成 UUID 赋值给 request.id                           │
│                                                                         │
│  ② onRequest Hook: 请求日志                                             │
│     └─ logger.info({ requestId, method, url }, 'Incoming request')     │
│                                                                         │
│  ③ 路由匹配: /api/users/* → @fastify/http-proxy                        │
│     ├─ 匹配前缀: /api/users                                             │
│     ├─ 重写前缀: /api/users → /users                                    │
│     ├─ 上游地址: http://user-service:3001                               │
│     └─ 请求超时: 30000ms                                                │
│                                                                         │
│  ④ 代理转发: rewriteRequestHeaders                                      │
│     ├─ 透传原始请求头                                                   │
│     ├─ 注入 x-request-id: request.id                                    │
│     └─ 注入 x-forwarded-for: 客户端 IP                                  │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               │  HTTP GET /users/1
                               │  Headers: x-request-id, x-forwarded-for
                               ▼
┌─────────────────────── User Service (Fastify, :3001) ──────────────────┐
│                                                                         │
│  ⑤ Fastify 接收请求，requestIdHeader='x-request-id'                     │
│     └─ 从请求头读取 x-request-id → 赋值给 request.id                    │
│                                                                         │
│  ⑥ onRequest Hook: 请求日志                                             │
│     └─ logger.info({ requestId, method, url }, 'Incoming request')     │
│                                                                         │
│  ⑦ 路由匹配: GET /users/:id → userRoutes                                │
│     └─ schema: getUserSchema (校验 params.id 为数字)                    │
│                                                                         │
│  ⑧ 参数校验 (Fastify 内置 JSON Schema 校验)                             │
│     ├─ 校验通过 → 进入 Controller                                       │
│     └─ 校验失败 → 抛出 validation error → 进入错误处理                  │
│                                                                         │
│  ⑨ Controller: userController.getById                                   │
│     └─ 解析 params.id → 调用 userService.getById(id)                   │
│                                                                         │
│  ⑩ Service: userService.getById                                         │
│     ├─ 用户存在 → 返回 User 对象                                        │
│     └─ 用户不存在 → 抛出 BizError(USER_NOT_FOUND, 404)                 │
│                                                                         │
│  ⑪ 响应构造: sendSuccess(reply, user)                                   │
│     └─ 构造统一响应体: { code: 0, data: user, message, requestId }      │
│                                                                         │
│  ⑫ onResponse Hook: 响应日志                                            │
│     └─ logger.info({ requestId, statusCode, responseTime })            │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               │  HTTP 200 { code: 0, data: {...}, ... }
                               ▼
┌─────────────────────── Gateway (代理响应回传) ─────────────────────────┐
│                                                                         │
│  ⑬ 代理将上游响应原样回传给客户端                                        │
│                                                                         │
│  ⑭ onSend Hook: requestIdMiddleware                                     │
│     └─ 在响应头中写入 x-request-id                                       │
│                                                                         │
│  ⑮ onResponse Hook: 响应日志                                            │
│     └─ logger.info({ requestId, statusCode, responseTime })            │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               │  HTTP 200
                               │  Headers: x-request-id
                               │  Body: { code: 0, data: {...}, message, requestId }
                               ▼
                          客户端 (Client)
```

---

## 三、各阶段详细说明

### 3.1 请求进入 Gateway

**入口文件**: `services/gateway/src/index.ts`

Gateway 使用 Fastify 框架，监听 `0.0.0.0:3000`。请求到达后依次经过以下处理：

1. **请求 ID 注入** (`middlewares/request-id.ts`)
   - 检查请求头 `x-request-id`，若上游已传递则复用，否则通过 `crypto.randomUUID()` 生成
   - 在 `onSend` 阶段将 `request.id` 写回响应头 `x-request-id`，方便客户端追踪

2. **请求日志** (`onRequest` Hook)
   - 记录 `requestId`、`method`、`url`

3. **路由匹配与代理转发** (`routes/proxy.ts`)
   - 使用 `@fastify/http-proxy` 插件，将 `/api/users/*` 的请求代理到 `http://user-service:3001/users/*`
   - 转发时通过 `rewriteRequestHeaders` 注入 `x-request-id` 和 `x-forwarded-for`，确保请求链路可追踪
   - 代理超时时间由 `GATEWAY_REQUEST_TIMEOUT` 控制（默认 30 秒）

4. **响应日志** (`onResponse` Hook)
   - 记录 `requestId`、`method`、`url`、`statusCode`、`responseTime`

### 3.2 请求到达 User Service

**入口文件**: `services/user-service/src/index.ts`

User Service 同样使用 Fastify，监听 `0.0.0.0:3001`。请求到达后依次经过：

1. **请求 ID 恢复**
   - Fastify 配置 `requestIdHeader: 'x-request-id'`，自动从请求头读取 Gateway 传递的 `x-request-id`，保持全链路追踪 ID 一致

2. **请求日志** (`onRequest` Hook)

3. **路由匹配** (`routes/user.routes.ts`)
   - 注册了 5 条路由：`GET /users`、`GET /users/:id`、`POST /users`、`PUT /users/:id`、`DELETE /users/:id`
   - 每条路由绑定 JSON Schema 用于参数校验

4. **参数校验** (`schemas/user.schema.ts`)
   - Fastify 内置 JSON Schema 校验，在路由处理前自动执行
   - 校验失败时抛出 `validation` 错误，被全局错误处理器捕获

5. **Controller 处理** (`controllers/user.controller.ts`)
   - 解析请求参数，调用 Service 层方法，使用 `sendSuccess()` 构造统一响应

6. **Service 业务逻辑** (`services/user.service.ts`)
   - 执行具体业务逻辑（当前为内存存储的示例实现）
   - 遇到业务异常时抛出 `BizError`

7. **响应日志** (`onResponse` Hook)

### 3.3 响应返回客户端

1. User Service 返回统一格式的 JSON 响应体
2. Gateway 的 `@fastify/http-proxy` 将上游响应原样回传
3. Gateway 的 `onSend` Hook 在响应头中写入 `x-request-id`
4. 客户端收到完整的 HTTP 响应

---

## 四、统一响应格式

所有 API 响应（无论成功或失败）都遵循以下结构（定义在 `packages/shared/src/types/api.ts`）：

```typescript
interface ApiResponse<T> {
  code: ErrorCode    // 业务状态码，0 = 成功
  data: T | null     // 响应数据
  message: string    // 响应消息
  requestId?: string // 请求追踪 ID
}
```

**成功响应示例**：
```json
{
  "code": 0,
  "data": { "id": 1, "name": "Alice", "email": "alice@example.com", "createdAt": "...", "updatedAt": "..." },
  "message": "success",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**错误响应示例**：
```json
{
  "code": 20001,
  "data": null,
  "message": "User with id 999 not found",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 五、错误处理机制

### 5.1 错误处理流程图

```
请求处理过程中发生错误
         │
         ▼
┌─ User Service 错误处理器 ──────────────────────────┐
│                                                     │
│  错误类型判断:                                       │
│  ├─ BizError → { code: bizError.code,               │
│  │              message, statusCode, requestId }     │
│  │              → 4xx/5xx                           │
│  │                                                  │
│  ├─ validation error → { code: VALIDATION_ERROR,    │
│  │                       message, requestId }        │
│  │                       → 400                      │
│  │                                                  │
│  └─ 其他错误 → { code: UNKNOWN,                     │
│                  message, requestId }                │
│                  → 500                              │
│                                                     │
└─────────────────────┬───────────────────────────────┘
                      │
                      │  错误响应已格式化为 ApiResponse
                      ▼
┌─ Gateway 错误处理器 (兜底) ─────────────────────────┐
│                                                     │
│  仅在 Gateway 自身处理请求时触发                      │
│  (代理请求的错误由 @fastify/http-proxy 处理)          │
│                                                     │
│  → { code: UNKNOWN, message, requestId }             │
│  → 500                                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 三层错误处理

| 层级 | 位置 | 处理方式 |
|------|------|----------|
| **Service 层** | `user.service.ts` | 抛出 `BizError`，携带 `ErrorCode` + HTTP 状态码 + 消息 |
| **全局错误处理器** | `user-service/src/index.ts` | 捕获所有错误，分类处理（BizError / 验证错误 / 未知错误），统一格式化为 `ApiResponse` |
| **Gateway 兜底** | `gateway/src/index.ts` | 仅处理 Gateway 自身产生的错误（如路由不存在），代理请求的错误由 `@fastify/http-proxy` 透传上游响应 |

### 5.3 错误码体系

定义在 `packages/shared/src/types/error.ts`：

| 错误码 | 值 | 含义 |
|--------|-----|------|
| `SUCCESS` | 0 | 成功 |
| `UNKNOWN` | 10000 | 未知错误 |
| `NOT_FOUND` | 10001 | 资源未找到 |
| `VALIDATION_ERROR` | 10002 | 参数校验失败 |
| `UNAUTHORIZED` | 10003 | 未授权 |
| `SERVICE_UNAVAILABLE` | 10004 | 服务不可用 |
| `TIMEOUT` | 10005 | 请求超时 |
| `RATE_LIMIT_EXCEEDED` | 10006 | 请求频率过高 |
| `USER_NOT_FOUND` | 20001 | 用户不存在 |
| `USER_ALREADY_EXISTS` | 20002 | 用户已存在 |
| `INVALID_PASSWORD` | 20003 | 密码错误 |

### 5.4 BizError 业务错误类

`BizError` 继承自 `Error`，额外携带：
- `code`: 业务错误码（`ErrorCode` 枚举）
- `statusCode`: HTTP 状态码（默认 400）
- 提供静态工厂方法：`notFound()`、`validation()`、`unauthorized()`、`serviceUnavailable()`

---

## 六、请求追踪机制

全链路追踪通过 **x-request-id** 实现：

```
Client                  Gateway                 User Service
  │                        │                        │
  │  ① 发送请求            │                        │
  │  (可能携带 x-request-id)│                        │
  │ ──────────────────────►│                        │
  │                        │                        │
  │                        │  ② requestIdMiddleware │
  │                        │  复用或生成 request.id  │
  │                        │                        │
  │                        │  ③ 代理转发             │
  │                        │  rewriteRequestHeaders │
  │                        │  注入 x-request-id     │
  │                        │ ──────────────────────►│
  │                        │                        │
  │                        │                        │  ④ 从请求头恢复
  │                        │                        │  request.id
  │                        │                        │
  │                        │                        │  ⑤ 日志中携带
  │                        │                        │  requestId
  │                        │                        │
  │                        │  ⑥ 响应回传            │
  │                        │ ◄──────────────────────│
  │                        │                        │
  │                        │  ⑦ onSend Hook         │
  │                        │  响应头写入             │
  │                        │  x-request-id          │
  │                        │                        │
  │  ⑧ 收到响应            │                        │
  │  (响应头含 x-request-id)│                        │
  │ ◄──────────────────────│                        │
```

**关键设计**：
- Gateway 是请求 ID 的**权威来源**，负责生成或复用
- 通过代理转发时，将 `request.id` 写入 `x-request-id` 请求头传递给上游服务
- User Service 通过 `requestIdHeader` 配置自动从请求头恢复 `request.id`
- 所有日志和响应体都携带 `requestId`，实现跨服务日志关联
- 响应头也返回 `x-request-id`，客户端可用于问题反馈

---

## 七、服务间通信方式

| 特性 | 说明 |
|------|------|
| **协议** | HTTP（同步请求-响应） |
| **代理方式** | `@fastify/http-proxy` 反向代理 |
| **路由映射** | `/api/users/*` → `http://user-service:3001/users/*` |
| **服务发现** | Docker Compose 内部 DNS（服务名即主机名） |
| **超时控制** | `GATEWAY_REQUEST_TIMEOUT`（默认 30s） |
| **请求头透传** | 原始请求头 + `x-request-id` + `x-forwarded-for` |

---

## 八、日志体系

使用 **Pino** 日志库，通过 `@scaffold/shared` 统一创建：

| 环境 | 输出格式 | 说明 |
|------|----------|------|
| 开发 | Pretty Print（彩色、可读） | 便于开发调试 |
| 生产 | JSON（结构化） | 便于日志聚合系统采集 |

每条日志自动携带：
- `service`: 服务名称（gateway / user-service）
- `level`: 日志级别（trace / debug / info / warn / error / fatal）
- `timestamp`: ISO 时间戳

---

## 九、优雅关闭

两个服务都实现了优雅关闭机制：

1. 监听 `SIGTERM` 和 `SIGINT` 信号
2. 收到信号后调用 `app.close()` 关闭 Fastify 实例
3. 停止接收新请求，等待正在处理的请求完成
4. 关闭完成后退出进程

这确保了在容器重启或部署时，正在处理的请求不会被强制中断。
