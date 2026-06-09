import type { FastifyRequest, FastifyReply } from 'fastify'
import { sendSuccess } from '@scaffold/shared'
import { userService } from '../services/user.service.js'
import type { CreateUserBody, UpdateUserBody } from '../schemas/user.schema.js'

interface IdParams {
  id: string
}

interface ListQuery {
  page?: number
  pageSize?: number
}

/**
 * 用户控制器 - 处理 HTTP 请求
 */
export const userController = {
  /**
   * 获取用户列表
   * GET /users
   */
  async list(
    request: FastifyRequest<{ Querystring: ListQuery }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { page = 1, pageSize = 20 } = request.query
    const result = userService.list(page, pageSize)
    return sendSuccess(reply, result)
  },

  /**
   * 获取单个用户
   * GET /users/:id
   */
  async getById(
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const id = parseInt(request.params.id, 10)
    const user = userService.getById(id)
    return sendSuccess(reply, user)
  },

  /**
   * 创建用户
   * POST /users
   */
  async create(
    request: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const user = userService.create(request.body)
    return sendSuccess(reply, user, 'User created successfully', 201)
  },

  /**
   * 更新用户
   * PUT /users/:id
   */
  async update(
    request: FastifyRequest<{ Params: IdParams; Body: UpdateUserBody }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const id = parseInt(request.params.id, 10)
    const user = userService.update(id, request.body)
    return sendSuccess(reply, user, 'User updated successfully')
  },

  /**
   * 删除用户
   * DELETE /users/:id
   */
  async delete(
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const id = parseInt(request.params.id, 10)
    userService.delete(id)
    return sendSuccess(reply, null, 'User deleted successfully')
  },
}
