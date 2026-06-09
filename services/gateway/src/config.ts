import { getNumberEnv, getOptionalEnv } from '@scaffold/shared'

export interface GatewayConfig {
  /** 网关服务端口 */
  port: number
  /** 运行环境 */
  nodeEnv: string
  /** 请求超时时间 (ms) */
  requestTimeout: number
  /** 上游服务配置 */
  upstream: {
    userService: string
  }
}

export function loadConfig(): GatewayConfig {
  return {
    port: getNumberEnv('GATEWAY_PORT', 3000),
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
    requestTimeout: getNumberEnv('GATEWAY_REQUEST_TIMEOUT', 30000),
    upstream: {
      // Docker Compose 环境下使用服务名作为主机名
      userService: getOptionalEnv('USER_SERVICE_URL', 'http://user-service:3001'),
    },
  }
}
