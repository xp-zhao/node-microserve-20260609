# 用户请求处理完整流程分析

## 一、项目架构概览

这是一个基于 **Fastify + TypeScript** 的 Node.js 微服务脚手架项目，采用 API 网关模式。

### 核心组件

| 服务/模块 | 端口 | 职责 |
|-----------|------|------|
| **Gateway** (网关) | 3000 | 统一入口、请求路由、日志记录、错误处理 |
| **User Service** (用户服务) | 3001 | 用户相关业务逻辑处理 |
| **Shared** (共享包) | - | 公共类型定义、工具函数、日志封装 |

### 技术栈
- **Web 框架**: Fastify v4
- **日志**: Pino
- **代理**: @fastify/http-proxy
- **语言**: TypeScript (严格模式)
- **部署**: Docker + Docker Compose

---

## 二、请求处理完整流程图

```
客户端 (Client)
    │
    │ HTTP Request (例如: POST http://localhost:3000/api/users)
    ▼
┌─────────────────────────────────────────────────────────────┐
│                     Gateway 网关 (端口 3000)                  │
├─────────────────────────────────────────────────────────────┤
│  1. Fastify 接收请求                                         │
│     └─ 配置 requestIdHeader: 'x-request-id'                  │
│                                                               │
│  2. requestIdMiddleware (onRequest Hook)  [request-id.ts]    │
│     ├─ 检查请求头是否有 x-request-id                          │
│     ├─ 有则复用，无则生成 UUID                                │
│     └─ 设置 request.id                                        │
│                                                               │
│  3. 请求日志 (onRequest Hook)             [index.ts:20-22]   │
│     └─ logger.info 记录: requestId, method, url               │
│                                                               │
│  4. 路由匹配 & 代理转发                     [proxy.ts]        │
│     ├─ 匹配 /api/users/* 前缀                                  │
│     ├─ 路径重写: /api/users/* → /users/*                      │
│     ├─ 注入请求头:                                             │
│     │   ├─ x-request-id (透传/生成的请求ID)                   │
│     │   └─ x-forwarded-for (客户端IP)                         │
│     └─ 转发到 http://user-service:3001                       │
│                                                               │
│  5. onSend Hook                            [request-id.ts]   │
│     └─ 响应头设置 x-request-id                                │
│                                                               │
│  6. 响应日志 (onResponse Hook)            [index.ts:25-36]   │
│     └─ logger.info 记录: statusCode, responseTime             │
│                                                               │
│  7. 全局错误处理 (如需要)                 [index.ts:39-51]   │
│     └─ setErrorHandler 捕获异常，统一格式响应                  │
└─────────────────────────────────────────────────────────────┘
    │
    │ HTTP Proxy 转发 (带 x-request-id)
    ▼
┌─────────────────────────────────────────────────────────────┐
│                  User Service 用户服务 (端口 3001)            │
├─────────────────────────────────────────────────────────────┤
│  1. Fastify 接收请求                                         │
│     └─ 从 x-request-id 头读取 requestId，保持链路追踪         │
│                                                               │
│  2. 请求日志 (onRequest Hook)             [index.ts:15-20]   │
│     └─ logger.info 记录请求信息 (相同 requestId)              │
│                                                               │
│  3. Schema 参数校验                        [user.schema.ts]  │
│     ├─ Fastify 内置 JSON Schema 验证                          │
│     ├─ params: id 必须为数字格式                              │
│     ├─ query: page/pageSize 分页参数校验                      │
│     └─ body: name/email 格式与必填校验                        │
│     ❌ 校验失败 → 直接返回 400 错误                            │
│                                                               │
│  4. 路由匹配 & 分发                         [user.routes.ts] │
│     ├─ GET    /users        → userController.list             │
│     ├─ GET    /users/:id    → userController.getById          │
│     ├─ POST   /users        → userController.create           │
│     ├─ PUT    /users/:id    → userController.update           │
│     └─ DELETE /users/:id    → userController.delete           │
│                                                               │
│  5. Controller 层处理                      [user.controller.ts]
│     ├─ 解析 request.params/query/body                         │
│     ├─ 参数类型转换 (id: string → number)                     │
│     └─ 调用 Service 层业务方法                                │
│                                                               │
│  6. Service 层业务逻辑                    [user.service.ts]  │
│     ├─ list(): 分页查询用户列表 (内存 Map)                    │
│     ├─ getById(): 根据ID查找，不存在抛出 BizError             │
│     ├─ create(): 创建用户，邮箱重复抛出 BizError              │
│     ├─ update(): 更新用户，校验邮箱唯一性                     │
│     └─ delete(): 删除用户，不存在抛出 BizError                │
│     ❌ 业务异常 → 抛出 BizError                                │
│                                                               │
│  7. sendSuccess 响应封装                   [response.ts]     │
│     └─ 统一响应格式: { code, data, message, requestId }       │
│                                                               │
│  8. 响应日志 (onResponse Hook)            [index.ts:23-34]   │
│     └─ 记录响应状态码和耗时                                    │
│                                                               │
│  9. 全局错误处理 (如需要)                 [index.ts:37-73]   │
│     ├─ 识别 BizError → 返回对应 code/statusCode               │
│     ├─ 识别 validation 错误 → 返回 400                        │
│     └─ 其他错误 → 500 UNKNOWN                                 │
└─────────────────────────────────────────────────────────────┘
    │
    │ HTTP Response (统一JSON格式)
    ▼
回到 Gateway → 返回给客户端
```

---

## 三、各阶段详细说明

### 阶段 1: Gateway 接收请求

**文件**: [services/gateway/src/index.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/gateway/src/index.ts)

Gateway 作为系统唯一对外入口，在初始化时配置：

```typescript
const app = Fastify({
  logger: false,                    // 禁用默认日志，使用自定义 Pino
  requestIdHeader: 'x-request-id',  // 从该header读取/写入请求ID
  genReqId: () => crypto.randomUUID(),
})
```

### 阶段 2: 请求 ID 中间件

**文件**: [services/gateway/src/middlewares/request-id.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/gateway/src/middlewares/request-id.ts)

这是实现**全链路追踪**的关键：
- 如果客户端已传 `x-request-id`，则复用该 ID
- 否则生成新的 UUID
- 响应时在 header 中返回 `x-request-id`，便于问题排查
- 代理转发时将 ID 透传给下游服务

### 阶段 3: 日志记录 Hook

Gateway 和 User Service 都注册了两个关键 Hook：

| Hook | 时机 | 记录内容 |
|------|------|----------|
| `onRequest` | 请求到达时 | requestId, method, url |
| `onResponse` | 响应发送时 | requestId, statusCode, responseTime |

**日志实现**: [packages/shared/src/logger/index.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/logger/index.ts)
- 开发环境: pino-pretty 彩色格式化输出
- 生产环境: JSON 格式便于日志聚合
- 每条日志携带 `service` 字段标识来源服务

### 阶段 4: 网关代理转发

**文件**: [services/gateway/src/routes/proxy.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/gateway/src/routes/proxy.ts)

使用 `@fastify/http-proxy` 实现反向代理：

```typescript
await app.register(proxy.default, {
  upstream: config.upstream.userService,  // http://user-service:3001
  prefix: '/api/users',                   // 匹配路径前缀
  rewritePrefix: '/users',                // 路径重写
  http: { requestOptions: { timeout: 30000 } },
  replyOptions: {
    rewriteRequestHeaders: (originalReq, headers) => ({
      ...headers,
      'x-request-id': originalReq.id,      // 透传请求ID
      'x-forwarded-for': originalReq.ip,   // 传递客户端IP
    })
  }
})
```

路径转换示例：
- `GET /api/users` → `http://user-service:3001/users`
- `GET /api/users/1` → `http://user-service:3001/users/1`
- `POST /api/users` → `http://user-service:3001/users`

### 阶段 5: User Service 参数校验

**文件**: [services/user-service/src/schemas/user.schema.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/schemas/user.schema.ts)

路由注册时绑定 JSON Schema，Fastify **自动完成校验**：

```typescript
app.get('/users/:id', { schema: getUserSchema }, userController.getById)
```

校验规则包括：
- **params**: `id` 必须是数字字符串
- **query**: `page` ≥ 1, `pageSize` 1-100
- **body**: `name` 1-100字符, `email` 格式正确
- `additionalProperties: false` 禁止额外字段

校验失败时 Fastify 自动抛出 validation 错误，由错误处理器统一处理。

### 阶段 6: Controller 层

**文件**: [services/user-service/src/controllers/user.controller.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/controllers/user.controller.ts)

Controller 职责：
1. 从 `request` 中提取参数 (params/query/body)
2. 类型转换 (如 id 从 string 转为 number)
3. 调用对应的 Service 方法
4. 通过 `sendSuccess()` 返回统一格式响应

示例：
```typescript
async getById(request, reply) {
  const id = parseInt(request.params.id, 10)
  const user = userService.getById(id)  // 可能抛出 BizError
  return sendSuccess(reply, user)
}
```

### 阶段 7: Service 业务层

**文件**: [services/user-service/src/services/user.service.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/services/user.service.ts)

Service 层封装核心业务逻辑，使用内存 Map 存储示例数据：

| 方法 | 业务规则 | 异常场景 |
|------|----------|----------|
| `list()` | 分页切片 | - |
| `getById()` | Map 查找 | 用户不存在 → BizError(USER_NOT_FOUND, 404) |
| `create()` | 邮箱唯一性检查 | 邮箱已存在 → BizError(USER_ALREADY_EXISTS, 409) |
| `update()` | 存在性+邮箱冲突检查 | 同上 |
| `delete()` | 存在性检查 | 用户不存在 → BizError(USER_NOT_FOUND, 404) |

业务异常通过 `throw new BizError()` 抛出，不使用 try-catch，由全局错误处理器统一捕获。

---

## 四、统一响应格式

**文件**: [packages/shared/src/utils/response.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/utils/response.ts)

所有 API 响应遵循统一结构，定义在 [ApiResponse](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/types/api.ts#L4-L13)：

```typescript
interface ApiResponse<T> {
  code: ErrorCode        // 0=成功，其他=失败
  data: T | null         // 响应数据
  message: string        // 提示信息
  requestId?: string     // 请求追踪ID
}
```

### 成功响应示例

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  },
  "message": "success",
  "requestId": "a1b2c3d4-..."
}
```

### 失败响应示例

```json
{
  "code": 20001,
  "data": null,
  "message": "User with id 999 not found",
  "requestId": "a1b2c3d4-..."
}
```

---

## 五、错误处理机制详解

### 5.1 错误码定义

**文件**: [packages/shared/src/types/error.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/types/error.ts)

| 错误码范围 | 分类 | 示例 |
|-----------|------|------|
| 0 | 成功 | SUCCESS |
| 10000-10999 | 通用错误 | UNKNOWN(10000), NOT_FOUND(10001), VALIDATION_ERROR(10002) |
| 20000-20999 | 用户相关 | USER_NOT_FOUND(20001), USER_ALREADY_EXISTS(20002) |

### 5.2 BizError 业务错误类

自定义错误类，携带业务错误码和 HTTP 状态码：

```typescript
class BizError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400
  )
}
```

提供静态工厂方法：
- `BizError.notFound()` → 404
- `BizError.validation()` → 400
- `BizError.unauthorized()` → 401
- `BizError.serviceUnavailable()` → 503

### 5.3 全局错误处理器

**Gateway 错误处理**: [services/gateway/src/index.ts:39-51](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/gateway/src/index.ts#L39-L51)
- 捕获所有未处理异常
- 记录 error 级别日志（含 stack 栈追踪）
- 返回 UNKNOWN(10000) 错误码

**User Service 错误处理**: [services/user-service/src/index.ts:37-73](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/index.ts#L37-L73)

分级处理逻辑：

```
错误抛出
    │
    ├─→ error.name === 'BizError'?
    │       YES → 使用 bizError.code + bizError.statusCode
    │
    ├─→ error.validation 存在? (Fastify参数校验错误)
    │       YES → code=VALIDATION_ERROR(10002), status=400
    │
    └─→ 其他错误
            YES → code=UNKNOWN(10000), status=500
```

错误处理后统一调用 `logger.error()` 记录完整堆栈，再格式化响应返回。

### 5.4 错误冒泡流程

```
Service 层 throw BizError
    ↓
Controller 不捕获（或继续抛出）
    ↓
Fastify 捕获，传给 setErrorHandler
    ↓
全局错误处理器识别错误类型 → 格式化响应
    ↓
Gateway 接收响应 → 透传回客户端
```

---

## 六、关键设计特点

### 1. 全链路请求追踪
通过 `x-request-id` 在 Gateway 和各服务间传递，所有日志携带该 ID，便于分布式环境下排查问题。

### 2. 关注点分离
- **Gateway**: 路由代理、横切关注点（日志、错误处理、请求ID）
- **Controller**: HTTP 协议层处理（参数解析、格式转换）
- **Service**: 纯业务逻辑，可独立测试
- **Shared**: 跨服务复用的代码，避免重复

### 3. 统一错误处理
- 业务错误通过 `BizError` 抛出
- 全局错误处理器兜底
- 不使用 try-catch 包裹业务代码，异常自动冒泡

### 4. Schema 驱动的参数校验
- 利用 Fastify 内置的 JSON Schema 验证
- 声明式定义校验规则
- 类型安全（TypeScript + as const）

---

## 七、关键文件速查表

| 功能 | 文件路径 |
|------|----------|
| Gateway 入口 | [services/gateway/src/index.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/gateway/src/index.ts) |
| 代理路由 | [services/gateway/src/routes/proxy.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/gateway/src/routes/proxy.ts) |
| 请求ID中间件 | [services/gateway/src/middlewares/request-id.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/gateway/src/middlewares/request-id.ts) |
| User Service 入口 | [services/user-service/src/index.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/index.ts) |
| 用户路由 | [services/user-service/src/routes/user.routes.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/routes/user.routes.ts) |
| 用户控制器 | [services/user-service/src/controllers/user.controller.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/controllers/user.controller.ts) |
| 用户服务 | [services/user-service/src/services/user.service.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/services/user.service.ts) |
| 参数Schema | [services/user-service/src/schemas/user.schema.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/services/user-service/src/schemas/user.schema.ts) |
| 错误码定义 | [packages/shared/src/types/error.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/types/error.ts) |
| 响应工具 | [packages/shared/src/utils/response.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/utils/response.ts) |
| 日志封装 | [packages/shared/src/logger/index.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/logger/index.ts) |
| 环境变量工具 | [packages/shared/src/utils/env.ts](file:///d:/code/trae/gsb/20260608/node-microserve-代码理解-1/Autumn/packages/shared/src/utils/env.ts) |
