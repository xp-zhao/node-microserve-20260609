import { BizError, ErrorCode, createPaginatedData, type PaginatedData } from '@scaffold/shared'
import type { User, CreateUserBody, UpdateUserBody } from '../schemas/user.schema.js'

/**
 * 用户服务 - 业务逻辑层
 *
 * 注意：这是示例实现，使用内存存储
 * 实际项目中应替换为数据库操作
 */
class UserService {
  private users: Map<number, User> = new Map()
  private nextId = 1

  constructor() {
    // 初始化一些示例数据
    this.create({ name: 'Alice', email: 'alice@example.com' })
    this.create({ name: 'Bob', email: 'bob@example.com' })
    this.create({ name: 'Charlie', email: 'charlie@example.com' })
  }

  /**
   * 获取用户列表（分页）
   */
  list(page: number, pageSize: number): PaginatedData<User> {
    const allUsers = Array.from(this.users.values())
    const total = allUsers.length
    const start = (page - 1) * pageSize
    const list = allUsers.slice(start, start + pageSize)

    return createPaginatedData(list, total, page, pageSize)
  }

  /**
   * 根据 ID 获取用户
   */
  getById(id: number): User {
    const user = this.users.get(id)
    if (!user) {
      throw new BizError(ErrorCode.USER_NOT_FOUND, `User with id ${id} not found`, 404)
    }
    return user
  }

  /**
   * 创建用户
   */
  create(data: CreateUserBody): User {
    // 检查邮箱是否已存在
    const existingUser = Array.from(this.users.values()).find((u) => u.email === data.email)
    if (existingUser) {
      throw new BizError(ErrorCode.USER_ALREADY_EXISTS, `Email ${data.email} already exists`, 409)
    }

    const now = new Date()
    const user: User = {
      id: this.nextId++,
      name: data.name,
      email: data.email,
      createdAt: now,
      updatedAt: now,
    }

    this.users.set(user.id, user)
    return user
  }

  /**
   * 更新用户
   */
  update(id: number, data: UpdateUserBody): User {
    const user = this.getById(id)

    // 如果要更新邮箱，检查是否与其他用户冲突
    if (data.email && data.email !== user.email) {
      const existingUser = Array.from(this.users.values()).find(
        (u) => u.email === data.email && u.id !== id
      )
      if (existingUser) {
        throw new BizError(ErrorCode.USER_ALREADY_EXISTS, `Email ${data.email} already exists`, 409)
      }
    }

    const updatedUser: User = {
      ...user,
      ...data,
      updatedAt: new Date(),
    }

    this.users.set(id, updatedUser)
    return updatedUser
  }

  /**
   * 删除用户
   */
  delete(id: number): void {
    if (!this.users.has(id)) {
      throw new BizError(ErrorCode.USER_NOT_FOUND, `User with id ${id} not found`, 404)
    }
    this.users.delete(id)
  }
}

// 导出单例
export const userService = new UserService()
