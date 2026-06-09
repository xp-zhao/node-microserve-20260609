import type { FastifyInstance } from 'fastify'
import crypto from 'crypto'

/**
 * 请求 ID 中间件
 * 为每个请求生成唯一 ID，便于日志追踪
 */
export async function requestIdMiddleware(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request) => {
    // 如果上游已经传递了请求 ID，则复用；否则生成新的
    const existingId = request.headers['x-request-id']
    if (typeof existingId === 'string' && existingId) {
      request.id = existingId
    } else {
      request.id = crypto.randomUUID()
    }
  })

  // 在响应头中返回请求 ID
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })
}
