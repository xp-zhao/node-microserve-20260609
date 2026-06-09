/** 用户实体类型 */
export interface User {
  id: number
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

/** 创建用户请求体 */
export interface CreateUserBody {
  name: string
  email: string
}

/** 更新用户请求体 */
export interface UpdateUserBody {
  name?: string
  email?: string
}

/** 创建用户的 JSON Schema */
export const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      email: { type: 'string', format: 'email' },
    },
    additionalProperties: false,
  },
} as const

/** 更新用户的 JSON Schema */
export const updateUserSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      email: { type: 'string', format: 'email' },
    },
    additionalProperties: false,
  },
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
} as const

/** 获取单个用户的 JSON Schema */
export const getUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
} as const

/** 分页查询的 JSON Schema */
export const listUsersSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
} as const
