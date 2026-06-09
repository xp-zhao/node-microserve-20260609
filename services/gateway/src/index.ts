import Fastify from 'fastify'
import { createLogger, ErrorCode, type ApiResponse } from '@scaffold/shared'
import { loadConfig } from './config.js'
import { registerProxyRoutes } from './routes/proxy.js'
import { requestIdMiddleware } from './middlewares/request-id.js'

const config = loadConfig()
const logger = createLogger({ service: 'gateway' })

const app = Fastify({
  logger: false, // 使用自定义 logger
  requestIdHeader: 'x-request-id',
  genReqId: () => crypto.randomUUID(),
})

// 注册请求 ID 中间件
await requestIdMiddleware(app)

// 请求日志
app.addHook('onRequest', async (request) => {
  logger.info({ requestId: request.id, method: request.method, url: request.url }, 'Incoming request')
})

// 响应日志
app.addHook('onResponse', async (request, reply) => {
  logger.info(
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    },
    'Request completed'
  )
})

// 全局错误处理
app.setErrorHandler((error, request, reply) => {
  logger.error({ requestId: request.id, error: error.message, stack: error.stack }, 'Request error')

  const statusCode = error.statusCode || 500
  const response: ApiResponse<null> = {
    code: ErrorCode.UNKNOWN,
    data: null,
    message: error.message || 'Internal Server Error',
    requestId: request.id,
  }

  return reply.status(statusCode).send(response)
})

// 注册代理路由
await registerProxyRoutes(app, config)

// 启动服务
const start = async (): Promise<void> => {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' })
    logger.info(`Gateway is running on http://0.0.0.0:${config.port}`)
    logger.info(`Environment: ${config.nodeEnv}`)
    logger.info(`Upstream services:`)
    logger.info(`  - User Service: ${config.upstream.userService}`)
  } catch (err) {
    logger.error(err, 'Failed to start gateway')
    process.exit(1)
  }
}

// 优雅关闭
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully...`)
  try {
    await app.close()
    logger.info('Gateway closed')
    process.exit(0)
  } catch (err) {
    logger.error(err, 'Error during shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

start()
