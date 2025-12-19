import axios from 'axios'

// 创建axios实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 可以在这里添加认证token等
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// API接口
export const typeApi = {
  getTypes: (params = {}) => {
    // 移除page参数，一次拉取所有数据
    const { page, ...restParams } = params;
    return apiClient.get('/types', { params: restParams })
  },
  getTypeById: (id) => {
    return apiClient.get(`/types/${id}`)
  },
  syncTypes: () => {
    // 移除page参数
    return apiClient.get('/types/sync')
  },
  createType: (typeData) => {
    return apiClient.post('/types', typeData)
  },
  updateType: (id, typeData) => {
    return apiClient.put(`/types/${id}`, typeData)
  },
  deleteType: (id) => {
    return apiClient.delete(`/types/${id}`)
  }
}

export default apiClient