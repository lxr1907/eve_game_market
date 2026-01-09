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
  },

  // 获取name不为null的数据总数
  async getCountWithNameNotNull() {
    const response = await apiClient.get(`/types/count-with-name-not-null`);
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
  },
  
  // 同步区域类型
  async syncRegionTypes(regionId) {
    const response = await apiClient.get(`/regions/${regionId}/sync-types`);
    return response;
  },
  
  // 同步所有区域类型
  async syncAllRegionTypes() {
    const response = await apiClient.get('/regions/sync-all-types');
    return response;
  }
};

export const orderApi = {
  // 同步订单数据
  async syncOrders(regionId, typeId) {
    const response = await apiClient.post(`/orders/${regionId}/${typeId}/sync`);
    return response;
  },
  
  // 获取订单数据
  async getOrders(params = {}) {
    const response = await apiClient.get(`/orders`, { params });
    return response;
  },
  
  // 根据区域获取可用类型
  async getAvailableTypesByRegion(regionId, params = {}) {
    const response = await apiClient.get(`/regions/${regionId}/types`, { params });
    return response;
  }
};

export const loyaltyApi = {
  // 同步忠诚度商店商品
  async syncLoyaltyOffers(corporationId, datasource = 'serenity') {
    const response = await apiClient.post(`/loyalty/offers/sync`, { corporationId, datasource });
    return response;
  },
  
  // 获取所有忠诚度商店商品
  async getLoyaltyOffers(page = 1, limit = 10, corporationId = null, search = '', datasource = 'serenity') {
    const params = { page, limit, datasource };
    if (corporationId) {
      params.corporationId = corporationId;
    }
    if (search) {
      params.search = search;
    }
    const response = await apiClient.get(`/loyalty/offers`, { params });
    return response;
  },
  
  // 获取单个忠诚度商店商品
  async getLoyaltyOfferById(id, datasource = 'serenity') {
    const response = await apiClient.get(`/loyalty/offers/${id}`, { params: { datasource } });
    return response;
  },
  
  // 创建忠诚度商店商品
  async createLoyaltyOffer(data) {
    const response = await apiClient.post(`/loyalty/offers`, data);
    return response;
  },
  
  // 更新忠诚度商店商品
  async updateLoyaltyOffer(id, data) {
    const response = await apiClient.put(`/loyalty/offers/${id}`, data);
    return response;
  },
  
  // 删除忠诚度商店商品
  async deleteLoyaltyOffer(id, datasource = 'serenity') {
    const response = await apiClient.delete(`/loyalty/offers/${id}`, { params: { datasource } });
    return response;
  },
  
  // 计算LP收益（旧接口，保留但不建议使用）
  async calculateProfit(corporationId, datasource = 'serenity') {
    const response = await apiClient.post(`/loyalty/offers/calculate-profit`, { corporationId, datasource });
    return response;
  },
  
  // 清理并重新计算LP收益（新接口）
  async cleanAndRecalculateProfit(corporationId, datasource = 'serenity') {
    const response = await apiClient.post(`/loyalty/offers/clean-recalculate-profit`, { corporationId, datasource });
    return response;
  },

  // 获取收益数据
  async getProfitData(page = 1, limit = 10, filters = {}) {
    const response = await apiClient.get(`/loyalty/profit-data`, { 
      params: { 
        page, 
        limit, 
        corporationId: filters.corporationId, 
        regionId: filters.regionId,
        datasource: filters.datasource || 'serenity'
      } 
    });
    return response;
  }
};

// Group API
export const groupApi = {
  getGroups: (params) => apiClient.get('/groups', { params }),
  getGroupById: (id) => apiClient.get(`/groups/${id}`),
  syncGroup: (id) => apiClient.get(`/groups/${id}/sync`),
  syncAllGroupsFromTypes: () => apiClient.get('/groups/sync-all')
};

// Category API
export const categoryApi = {
  getCategories: (params) => apiClient.get('/categories', { params }),
  getCategoryById: (id) => apiClient.get(`/categories/${id}`),
  syncCategory: (id) => apiClient.get(`/categories/${id}/sync`),
  syncAllCategoriesFromGroups: () => apiClient.get('/categories/sync-all')
};

// Online Player Stats API
export const onlinePlayerStatsApi = {
  // 获取所有统计数据
  async getStats(page = 1, limit = 10) {
    const response = await apiClient.get('/online-player-stats', { params: { page, limit } });
    return response;
  },
  
  // 根据日期范围获取统计数据
  async getStatsByDateRange(startDate, endDate, page = 1, limit = 10) {
    const response = await apiClient.get('/online-player-stats/by-date-range', { 
      params: { startDate, endDate, page, limit } 
    });
    return response;
  },
  
  // 获取最新的统计数据
  async getLatestStats() {
    const response = await apiClient.get('/online-player-stats/latest');
    return response;
  },
  
  // 手动记录一次统计数据
  async recordStats() {
    const response = await apiClient.post('/online-player-stats/record');
    return response;
  }
};

export default apiClient