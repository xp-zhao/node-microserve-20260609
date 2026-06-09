/** 业务错误码枚举 */
export enum ErrorCode {
  /** 成功 */
  SUCCESS = 0,

  // 10000-10999: 通用错误
  /** 未知错误 */
  UNKNOWN = 10000,
  /** 资源未找到 */
  NOT_FOUND = 10001,
  /** 请求参数验证失败 */
  VALIDATION_ERROR = 10002,
  /** 未授权 */
  UNAUTHORIZED = 10003,
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 10004,
  /** 请求超时 */
  TIMEOUT = 10005,
  /** 请求频率过高 */
  RATE_LIMIT_EXCEEDED = 10006,

  // 20000-20999: 用户相关错误
  /** 用户不存在 */
  USER_NOT_FOUND = 20001,
  /** 用户已存在 */
  USER_ALREADY_EXISTS = 20002,
  /** 密码错误 */
  INVALID_PASSWORD = 20003,
}

/** 业务错误类，用于抛出带有错误码的异常 */
export class BizError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'BizError'
  }

  /** 创建资源未找到错误 */
  static notFound(message = 'Resource not found'): BizError {
    return new BizError(ErrorCode.NOT_FOUND, message, 404)
  }

  /** 创建验证错误 */
  static validation(message: string): BizError {
    return new BizError(ErrorCode.VALIDATION_ERROR, message, 400)
  }

  /** 创建未授权错误 */
  static unauthorized(message = 'Unauthorized'): BizError {
    return new BizError(ErrorCode.UNAUTHORIZED, message, 401)
  }

  /** 创建服务不可用错误 */
  static serviceUnavailable(message = 'Service unavailable'): BizError {
    return new BizError(ErrorCode.SERVICE_UNAVAILABLE, message, 503)
  }
}
