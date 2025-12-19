const axios = require('axios');
require('dotenv').config();

class EveApiService {
  constructor() {
    this.client = axios.create({
      baseURL: `${process.env.EVE_API_BASE_URL}/${process.env.EVE_API_VERSION}`,
      headers: {
        'Accept-Language': process.env.EVE_API_LANGUAGE,
        'X-Compatibility-Date': process.env.EVE_API_COMPATIBILITY_DATE
      }
    });
    // 节流控制：跟踪上次请求时间
    this.lastRequestTime = 0;
    this.throttleInterval = 1000; // 1秒
  }

  async getTypeIds(page = 1) {
    try {
      const response = await this.client.get(`/universe/types/`, {
        params: {
          page: page
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching type IDs:', error.message);
      throw error;
    }
  }

  async getTypeDetails(typeId, retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      console.log(`Throttling request for type ID ${typeId}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      const response = await this.client.get(`/universe/types/${typeId}/`, {
        timeout: 5000 // 设置5秒超时
      });
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Timeout fetching type details for ID ${typeId}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getTypeDetails(typeId, retries - 1);
      } else {
        console.error(`Error fetching type details for ID ${typeId}: ${error.message}`);
        // 不再重试，返回null或抛出错误
        return null; // 返回null表示获取失败，但不中断整个同步过程
      }
    }
  }

  async getAllTypes(page = 1) {
    try {
      const typeIds = await this.getTypeIds(page);
      // 不再使用Promise.all并发请求，而是串行请求以配合节流控制
      const typeDetails = [];
      for (const id of typeIds) {
        const details = await this.getTypeDetails(id);
        typeDetails.push(details);
      }
      return typeDetails;
    } catch (error) {
      console.error('Error fetching all types:', error.message);
      throw error;
    }
  }

  async getAllTypesRecursively(startPage = 1, callback) {
    try {
      let page = startPage;
      let hasMoreData = true;
      
      while (hasMoreData) {
        console.log(`Fetching types from page ${page}...`);
        const typeIds = await this.getTypeIds(page);
        
        if (typeIds.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 不再使用Promise.all并发请求，而是串行请求以配合节流控制
        const typeDetails = [];
        for (const id of typeIds) {
          const details = await this.getTypeDetails(id);
          typeDetails.push(details);
        }
        
        console.log(`Fetched ${typeDetails.length} types from page ${page}`);
        
        // 调用回调函数处理当前页的数据
        if (callback && typeof callback === 'function') {
          await callback(typeDetails, page);
        }
        
        page++;
      }
      
      console.log('Finished fetching all types');
      return page - 1; // 返回总页数
    } catch (error) {
      console.error('Error in recursive fetching:', error.message);
      throw error;
    }
  }
}

module.exports = new EveApiService();