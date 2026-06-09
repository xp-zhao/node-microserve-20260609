import Fastify from 'fastify'
import { createLogger, ErrorCode, BizError, type ApiResponse, getNumberEnv, getOptionalEnv } from '@scaffold/shared'
import { userRoutes } from './routes/user.routes.js'

const port = getNumberEnv('USER_SERVICE_PORT', 3001)
const nodeEnv = getOptionalEnv('NODE_ENV', 'development')
const logger = createLogger({ service: 'user-service' })

const app = Fastify({
  logger: false,
  requestIdHeader: 'x-request-id',
})

// 请求日志
app.addHook('onRequest', async (request) => {
  logger.info(
    { requestId: request.id, method: request.method, url: request.url },
    'Incoming request'
  )
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

  // 处理业务错误
  if (error.name === 'BizError') {
    const bizError = error as unknown as BizError
    const response: ApiResponse<null> = {
      code: bizError.code,
      data: null,
      message: bizError.message,
      requestId: request.id,
    }
    return reply.status(bizError.statusCode).send(response)
  }

  // 处理 Fastify 验证错误
  if (error.validation) {
    const response: ApiResponse<null> = {
      code: ErrorCode.VALIDATION_ERROR,
      data: null,
      message: error.message,
      requestId: request.id,
    }
    return reply.status(400).send(response)
  }

  // 处理其他错误
  const statusCode = error.statusCode || 500
  const response: ApiResponse<null> = {
    code: ErrorCode.UNKNOWN,
    data: null,
    message: error.message || 'Internal Server Error',
    requestId: request.id,
  }

  return reply.status(statusCode).send(response)
})

// 健康检查
app.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() })
})

// 注册用户路由
await app.register(userRoutes)

// 启动服务
const start = async (): Promise<void> => {
  try {
    await app.listen({ port, host: '0.0.0.0' })
    logger.info(`User Service is running on http://0.0.0.0:${port}`)
    logger.info(`Environment: ${nodeEnv}`)
  } catch (err) {
    logger.error(err, 'Failed to start user service')
    process.exit(1)
  }
}

// 优雅关闭
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully...`)
  try {
    await app.close()
    logger.info('User Service closed')
    process.exit(0)
  } catch (err) {
    logger.error(err, 'Error during shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

start()
