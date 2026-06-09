import { ErrorCode } from './error.js'

/** 统一 API 响应结构 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码，0 表示成功 */
  code: ErrorCode
  /** 响应数据 */
  data: T | null
  /** 响应消息 */
  message: string
  /** 请求追踪 ID */
  requestId?: string
}

/** 分页查询参数 */
export interface PaginationQuery {
  /** 页码，从 1 开始 */
  page?: number
  /** 每页数量，默认 20 */
  pageSize?: number
}

/** 分页响应数据 */
export interface PaginatedData<T> {
  /** 数据列表 */
  list: T[]
  /** 总数量 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总页数 */
  totalPages: number
}

/** 创建分页响应数据的辅助函数 */
export function createPaginatedData<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedData<T> {
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
