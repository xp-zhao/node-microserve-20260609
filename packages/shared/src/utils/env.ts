/**
 * 环境变量读取与验证工具
 */

export interface EnvConfig {
  /** 运行环境 */
  NODE_ENV: 'development' | 'production' | 'test'
  /** 日志级别 */
  LOG_LEVEL: string
}

/**
 * 获取必需的环境变量，如果不存在则抛出错误
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

/**
 * 获取可选的环境变量，如果不存在则返回默认值
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

/**
 * 获取数字类型的环境变量
 */
export function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (value === undefined || value === '') {
    return defaultValue
  }
  const num = parseInt(value, 10)
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`)
  }
  return num
}

/**
 * 获取布尔类型的环境变量
 */
export function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]
  if (value === undefined || value === '') {
    return defaultValue
  }
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * 判断是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env['NODE_ENV'] !== 'production'
}

/**
 * 判断是否为生产环境
 */
export function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production'
}
