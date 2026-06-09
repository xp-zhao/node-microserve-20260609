import type { FastifyReply } from 'fastify'
import { ErrorCode, type ApiResponse } from '../types/index.js'

/**
 * 发送成功响应
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  message = 'success',
  statusCode = 200
): FastifyReply {
  const response: ApiResponse<T> = {
    code: ErrorCode.SUCCESS,
    data,
    message,
    requestId: reply.request.id,
  }
  return reply.status(statusCode).send(response)
}

/**
 * 发送错误响应
 */
export function sendError(
  reply: FastifyReply,
  code: ErrorCode,
  message: string,
  statusCode = 400
): FastifyReply {
  const response: ApiResponse<null> = {
    code,
    data: null,
    message,
    requestId: reply.request.id,
  }
  return reply.status(statusCode).send(response)
}

/**
 * 发送分页数据响应
 */
export function sendPaginated<T>(
  reply: FastifyReply,
  data: {
    list: T[]
    total: number
    page: number
    pageSize: number
  }
): FastifyReply {
  return sendSuccess(reply, {
    ...data,
    totalPages: Math.ceil(data.total / data.pageSize),
  })
}
