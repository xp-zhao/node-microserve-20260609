import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { GatewayConfig } from '../config.js'

/**
 * 注册代理路由
 * 将 /api/* 请求转发到对应的后端服务
 */
export async function registerProxyRoutes(
  app: FastifyInstance,
  config: GatewayConfig
): Promise<void> {
  // 动态导入 @fastify/http-proxy
  const proxy = await import('@fastify/http-proxy')

  // 用户服务路由: /api/users/* -> user-service:3001/users/*
  await app.register(proxy.default, {
    upstream: config.upstream.userService,
    prefix: '/api/users',
    rewritePrefix: '/users',
    http: {
      requestOptions: {
        timeout: config.requestTimeout,
      },
    },
    replyOptions: {
      // 透传请求头 - 使用宽松类型避免复杂泛型问题
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-request-id': (originalReq as FastifyRequest).id,
          'x-forwarded-for': (originalReq as FastifyRequest).ip,
        }
      },
    },
  })

  // 健康检查端点
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() })
  })

  // 根路径
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      name: 'Node.js Microservice Gateway',
      version: '1.0.0',
      endpoints: ['/api/users', '/health'],
    })
  })
}
