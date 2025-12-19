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
    return apiClient.get('/types', { params })
  },
  getTypeById: (id) => {
    return apiClient.get(`/types/${id}`)
  },
  syncTypeIds: () => {
    return apiClient.get('/types/sync-ids')
  },
  syncTypeDetails: () => {
    return apiClient.get('/types/sync-details')
  },
  createType: (typeData) => {
    return apiClient.post('/types', typeData)
  },
  updateType: (id, typeData) => {
    return apiClient.put(`/types/${id}`, typeData)
  },
  updateStatus: (id, status) => {
    return apiClient.put(`/types/${id}/update-status`, { status })
  },
  deleteType: (id) => {
    return apiClient.delete(`/types/${id}`)
  }
}

export default apiClient