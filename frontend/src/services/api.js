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
  // 获取所有类型数据
  async getTypes(page = 1, limit = 10, search = '') {
    const response = await apiClient.get(`/types`, { params: { page, limit, search } });
    return response;
  },
  
  // 同步Type IDs
  async syncTypeIds() {
    const response = await apiClient.get(`/types/sync-ids`);
    return response;
  },
  
  // 同步Type详情
  async syncTypeDetails() {
    const response = await apiClient.get(`/types/sync-details`);
    return response;
  },
  
  // 获取单个类型数据
  async getTypeById(id) {
    const response = await apiClient.get(`/types/${id}`);
    return response;
  },
  
  // 创建新类型
  async createType(data) {
    const response = await apiClient.post(`/types`, data);
    return response;
  },
  
  // 更新类型
  async updateType(id, data) {
    const response = await apiClient.put(`/types/${id}`, data);
    return response;
  },
  
  // 更新状态
  async updateStatus(id, status) {
    const response = await apiClient.put(`/types/${id}/update-status`, { status });
    return response;
  },
  
  // 删除类型
  async deleteType(id) {
    const response = await apiClient.delete(`/types/${id}`);
    return response;
  }
};

export const regionApi = {
  // 获取所有区域数据
  async getRegions(page = 1, limit = 10, search = '') {
    const response = await apiClient.get(`/regions`, { params: { page, limit, search } });
    return response;
  },
  
  // 同步Region IDs
  async syncRegionIds() {
    const response = await apiClient.get(`/regions/sync-ids`);
    return response;
  },
  
  // 同步Region详情
  async syncRegionDetails() {
    const response = await apiClient.get(`/regions/sync-details`);
    return response;
  },
  
  // 获取单个区域数据
  async getRegionById(id) {
    const response = await apiClient.get(`/regions/${id}`);
    return response;
  },
  
  // 创建新区域
  async createRegion(data) {
    const response = await apiClient.post(`/regions`, data);
    return response;
  },
  
  // 更新区域
  async updateRegion(id, data) {
    const response = await apiClient.put(`/regions/${id}`, data);
    return response;
  },
  
  // 删除区域
  async deleteRegion(id) {
    const response = await apiClient.delete(`/regions/${id}`);
    return response;
  }
};

export default apiClient