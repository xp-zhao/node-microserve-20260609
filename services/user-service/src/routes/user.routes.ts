import type { FastifyInstance } from 'fastify'
import { userController } from '../controllers/user.controller.js'
import {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  listUsersSchema,
} from '../schemas/user.schema.js'

/**
 * 注册用户相关路由
 */
export async function userRoutes(app: FastifyInstance): Promise<void> {
  // 获取用户列表
  app.get('/users', { schema: listUsersSchema }, userController.list)

  // 获取单个用户
  app.get('/users/:id', { schema: getUserSchema }, userController.getById)

  // 创建用户
  app.post('/users', { schema: createUserSchema }, userController.create)

  // 更新用户
  app.put('/users/:id', { schema: updateUserSchema }, userController.update)

  // 删除用户
  app.delete('/users/:id', { schema: getUserSchema }, userController.delete)
}
