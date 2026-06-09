import { pino, type Logger, type LoggerOptions } from 'pino'

export interface CreateLoggerOptions {
  /** 服务名称，用于标识日志来源 */
  service: string
  /** 日志级别，默认从环境变量 LOG_LEVEL 读取，兜底为 'info' */
  level?: string
}

/**
 * 创建统一格式的 Pino 日志实例
 * - 开发环境: pretty print，便于阅读
 * - 生产环境: JSON 格式，便于日志聚合
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { service, level = process.env['LOG_LEVEL'] || 'info' } = options
  const isDev = process.env['NODE_ENV'] !== 'production'

  const pinoOptions: LoggerOptions = {
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  }

  // 开发环境使用 pino-pretty 美化输出
  if (isDev) {
    return pino({
      ...pinoOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    })
  }

  return pino(pinoOptions)
}

export type { Logger } from 'pino'
