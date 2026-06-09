import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 用户服务单元测试示例
 *
 * 注意：由于 userService 是单例且带有内存状态，
 * 实际项目中应使用依赖注入或 mock 来隔离测试
 */

// 简单的内存用户存储用于测试
interface User {
  id: number
  name: string
  email: string
}

class TestUserService {
  private users: Map<number, User> = new Map()
  private nextId = 1

  create(data: { name: string; email: string }): User {
    const user: User = {
      id: this.nextId++,
      ...data,
    }
    this.users.set(user.id, user)
    return user
  }

  getById(id: number): User | undefined {
    return this.users.get(id)
  }

  list(): User[] {
    return Array.from(this.users.values())
  }

  delete(id: number): boolean {
    return this.users.delete(id)
  }

  clear(): void {
    this.users.clear()
    this.nextId = 1
  }
}

describe('UserService', () => {
  let userService: TestUserService

  beforeEach(() => {
    userService = new TestUserService()
  })

  describe('create', () => {
    it('should create a user with auto-generated id', () => {
      const user = userService.create({ name: 'Test User', email: 'test@example.com' })

      expect(user.id).toBe(1)
      expect(user.name).toBe('Test User')
      expect(user.email).toBe('test@example.com')
    })

    it('should increment id for each new user', () => {
      const user1 = userService.create({ name: 'User 1', email: 'user1@example.com' })
      const user2 = userService.create({ name: 'User 2', email: 'user2@example.com' })

      expect(user1.id).toBe(1)
      expect(user2.id).toBe(2)
    })
  })

  describe('getById', () => {
    it('should return user when exists', () => {
      const created = userService.create({ name: 'Test', email: 'test@example.com' })
      const found = userService.getById(created.id)

      expect(found).toEqual(created)
    })

    it('should return undefined when user not exists', () => {
      const found = userService.getById(999)

      expect(found).toBeUndefined()
    })
  })

  describe('list', () => {
    it('should return empty array when no users', () => {
      const users = userService.list()

      expect(users).toEqual([])
    })

    it('should return all users', () => {
      userService.create({ name: 'User 1', email: 'user1@example.com' })
      userService.create({ name: 'User 2', email: 'user2@example.com' })

      const users = userService.list()

      expect(users).toHaveLength(2)
    })
  })

  describe('delete', () => {
    it('should delete existing user', () => {
      const user = userService.create({ name: 'Test', email: 'test@example.com' })

      const result = userService.delete(user.id)

      expect(result).toBe(true)
      expect(userService.getById(user.id)).toBeUndefined()
    })

    it('should return false when user not exists', () => {
      const result = userService.delete(999)

      expect(result).toBe(false)
    })
  })
})
