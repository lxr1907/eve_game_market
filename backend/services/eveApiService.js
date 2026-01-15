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

  async getTypeIds(page = 1, datasource = 'serenity', retries = 3) {
    try {
      // 构建完整URL以便调试
      const fullUrl = `${process.env.EVE_API_BASE_URL}/${process.env.EVE_API_VERSION}/universe/types/?page=${page}&datasource=${datasource}`;
      console.log(`Sending request to full URL: ${fullUrl}`);
      console.log(`Sending request to /universe/types/?page=${page}&datasource=${datasource}`);
      const response = await this.client.get(`/universe/types/`, {
        params: {
          page: page,
          datasource: datasource
        },
        timeout: 10000 // 设置10秒超时
      });
      console.log(`Received ${response.data.length} type IDs from page ${page}`);
      return response.data;
    } catch (error) {
      // 检查是否是页码超出范围的错误（API返回500并提示"Requested page does not exist!"）
      if (error.response?.status === 500 && error.response?.data?.error?.includes('Requested page does not exist')) {
        console.log(`Page ${page} does not exist, stopping pagination`);
        return []; // 返回空数组表示没有更多数据
      }
      
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Error fetching type IDs for page ${page}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getTypeIds(page, retries - 1);
      } else {
        console.error('Error fetching type IDs:', error.message);
        if (error.response) {
          console.error(`Response status for stargate ID ${stargateId} in system ${systemId}:`, error.response.status);
          console.error(`Response data for stargate ID ${stargateId} in system ${systemId}:`, error.response.data);
        }
        throw error;
      }
    }
  }

  async getTypeDetails(typeId, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      const response = await this.client.get(`/universe/types/${typeId}/`, {
        params: {
          datasource: datasource
        },
        timeout: 10000 // 设置10秒超时
      });
      
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getTypeDetails(typeId, retries - 1);
      } else {
        console.error(`Error fetching type details for ID ${typeId}: ${error.message}`);
        return null; // 返回null表示获取失败，但不中断整个同步过程
      }
    }
  }

  async getGroupDetails(groupId, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      const response = await this.client.get(`/universe/groups/${groupId}/`, {
        params: {
          datasource: datasource
        },
        timeout: 5000 // 设置5秒超时
      });
      
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getGroupDetails(groupId, retries - 1);
      } else {
        console.error(`Error fetching group details for ID ${groupId}: ${error.message}`);
        return null; // 返回null表示获取失败，但不中断整个同步过程
      }
    }
  }

  async getCategoryDetails(categoryId, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      const response = await this.client.get(`/universe/categories/${categoryId}/`, {
        params: {
          datasource: datasource
        },
        timeout: 5000 // 设置5秒超时
      });
      
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getCategoryDetails(categoryId, retries - 1);
      } else {
        console.error(`Error fetching category details for ID ${categoryId}: ${error.message}`);
        return null; // 返回null表示获取失败，但不中断整个同步过程
      }
    }
  }

  // 批量获取类型详情，提高效率
  async getTypeDetailsBatch(typeIds, datasource = 'serenity', retries = 3) {
    console.log(`Processing batch of ${typeIds.length} type IDs`);
    
    // 将请求分块，每批最多50个请求（避免并发过多）
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < typeIds.length; i += chunkSize) {
      chunks.push(typeIds.slice(i, i + chunkSize));
    }
    
    const allResults = [];
    
    // 依次处理每个块
    for (const chunk of chunks) {
      // 节流控制：确保每1秒只处理一个块
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.throttleInterval) {
        const waitTime = this.throttleInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.lastRequestTime = Date.now();
      
      // 并发请求当前块中的所有类型详情
      const promises = chunk.map(id => this.getTypeDetails(id, datasource, 0)); // 不重试，由外层处理
      const results = await Promise.allSettled(promises);
      
      // 处理结果
      const chunkResults = results.map((result, index) => {
        if (result.status === 'fulfilled' && result.value !== null) {
          return result.value;
        } else {
          console.error(`Error fetching details for type ID ${chunk[index]}`);
          return null;
        }
      }).filter(Boolean); // 过滤掉null结果
      
      allResults.push(...chunkResults);
    }
    
    console.log(`Successfully fetched details for ${allResults.length}/${typeIds.length} type IDs`);
    return allResults;
  }

  // 获取特定公司的忠诚度商店商品
  async getLoyaltyStoreOffers(corporationId, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      console.log(`Throttling request for corporation ${corporationId} loyalty offers, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      let response;
      // 欧服使用不同的API端点
      if (datasource.toLowerCase() === 'tranquility') {
        const fullUrl = `https://esi.evetech.net/latest/loyalty/stores/${corporationId}/offers/`;
        console.log(`Sending request to EVE Tech API for loyalty store offers: ${fullUrl}`);
        response = await axios.get(fullUrl, {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': '',
            'If-None-Match': '',
            'X-Compatibility-Date': '2025-12-16',
            'X-Tenant': ''
          },
          timeout: 10000 // 设置10秒超时
        });
      } else {
        console.log(`Sending request for loyalty store offers: /loyalty/stores/${corporationId}/offers/?datasource=${datasource}`);
        response = await this.client.get(`/loyalty/stores/${corporationId}/offers/`, {
          params: {
            datasource: datasource
          },
          timeout: 10000 // 设置10秒超时
        });
      }
      
      console.log(`Received ${response.data.length} loyalty store offers for corporation ${corporationId}`);
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Timeout fetching loyalty store offers for corporation ${corporationId}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getLoyaltyStoreOffers(corporationId, datasource, retries - 1);
      } else {
        console.error(`Error fetching loyalty store offers for corporation ${corporationId}: ${error.message}`);
        if (error.response) {
          console.error(`Response status for stargate ID ${stargateId} in system ${systemId}:`, error.response.status);
          console.error(`Response data for stargate ID ${stargateId} in system ${systemId}:`, error.response.data);
        }
        throw error;
      }
    }
  }

  async getAllTypes(page = 1, datasource = 'serenity') {
    try {
      const typeIds = await this.getTypeIds(page, datasource);
      // 不再使用Promise.all并发请求，而是串行请求以配合节流控制
      const typeDetails = [];
      for (const id of typeIds) {
        const details = await this.getTypeDetails(id, datasource);
        typeDetails.push(details);
      }
      return typeDetails;
    } catch (error) {
      console.error('Error fetching all types:', error.message);
      throw error;
    }
  }

  async getAllTypesRecursively(startPage = 1, callback, idsOnly = false, datasource = 'serenity') {
    try {
      let page = startPage;
      let hasMoreData = true;
      
      console.log('Starting recursive fetch from page', startPage);
      
      while (hasMoreData) {
        console.log(`Fetching types from page ${page}...`);
        const typeIds = await this.getTypeIds(page, datasource);
        
        console.log(`Type IDs for page ${page}:`, typeIds.slice(0, 10), typeIds.length > 10 ? '...' : '');
        
        if (typeIds.length === 0) {
          hasMoreData = false;
          break;
        }
        
        let processedData = [];
        
        if (idsOnly) {
          // 如果只需要ID，直接使用typeIds
          processedData = typeIds;
          console.log(`Retrieved ${typeIds.length} type IDs from page ${page}`);
        } else {
          // 否则请求详细信息
          // 不再使用Promise.all并发请求，而是串行请求以配合节流控制
          const typeDetails = [];
          console.log(`Starting to fetch details for ${typeIds.length} type IDs from page ${page}`);
          let processedIds = 0;
          for (const id of typeIds) {
            processedIds++;
            if (processedIds % 10 === 0) {
              console.log(`Processed ${processedIds} out of ${typeIds.length} type IDs from page ${page}`);
            }
            const details = await this.getTypeDetails(id, datasource);
            if (details) {
              typeDetails.push(details);
            } else {
              console.log(`Skipping type ID ${id} due to null details`);
            }
          }
          
          processedData = typeDetails;
          console.log(`Fetched ${typeDetails.length} valid types from page ${page}`);
        }
        
        // 调用回调函数处理当前页的数据
        if (callback && typeof callback === 'function') {
          console.log(`Calling callback with ${processedData.length} items from page ${page}`);
          await callback(processedData, page);
        }
        
        page++;
      }
      
      console.log('Finished fetching all types');
      return page - 1; // 返回总页数
    } catch (error) {
      console.error('Error in recursive fetching:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Get server status
  async getServerStatus(datasource = 'serenity', retries = 3) {
    try {
      // 欧服使用不同的API端点
      if (datasource === 'tranquility') {
        const response = await axios.get('https://esi.evetech.net/status', {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': '',
            'If-None-Match': '',
            'X-Compatibility-Date': '2025-12-16',
            'X-Tenant': ''
          },
          timeout: 5000 // 设置5秒超时
        });
        return response.data;
      } else {
        // 其他服务器使用默认的API客户端配置
        const response = await this.client.get(`/status/`, {
          params: {
            datasource: datasource
          },
          timeout: 5000 // 设置5秒超时
        });
        return response.data;
      }
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        console.log(`Timeout fetching server status, retrying (${retries} left)...`);
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getServerStatus(datasource, retries - 1);
      } else {
        console.error('Error fetching server status:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    }
  }

  // Region-related methods
  async getRegionIds(page = 1, datasource = 'serenity', retries = 3) {
    try {
      console.log(`Sending request to /universe/regions/?page=${page}&datasource=${datasource}`);
      const response = await this.client.get(`/universe/regions/`, {
        params: {
          page: page,
          datasource: datasource
        },
        timeout: 10000 // 设置10秒超时
      });
      console.log(`Received ${response.data.length} region IDs from page ${page}`);
      return response.data;
    } catch (error) {
      // 检查是否是页码超出范围的错误（API返回500并提示"Requested page does not exist!"）
      if (error.response?.status === 500 && error.response?.data?.error?.includes('Requested page does not exist')) {
        console.log(`Page ${page} does not exist, stopping pagination`);
        return []; // 返回空数组表示没有更多数据
      }
      
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Error fetching region IDs for page ${page}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getRegionIds(page, retries - 1);
      } else {
        console.error('Error fetching region IDs:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    }
  }

  async getRegionDetails(regionId, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      console.log(`Throttling request for region ID ${regionId}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      console.log(`Sending request for region details: /universe/regions/${regionId}/?datasource=${datasource}`);
      const response = await this.client.get(`/universe/regions/${regionId}/`, {
        params: {
          datasource: datasource
        },
        timeout: 5000 // 设置5秒超时
      });
      
      console.log(`Received details for region ID ${regionId}: ${response.data.name || 'Unknown'}`);
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Timeout fetching region details for ID ${regionId}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getRegionDetails(regionId, retries - 1);
      } else {
        console.error(`Error fetching region details for ID ${regionId}: ${error.message}`);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        // 不再重试，返回null表示获取失败，但不中断整个同步过程
        return null;
      }
    }
  }

  async getMarketRegionTypes(regionId, page = 1, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      console.log(`Throttling request for market region types: regionId=${regionId}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      console.log(`Sending request for market region types: /markets/${regionId}/types/?page=${page}&datasource=${datasource}`);
      const response = await this.client.get(`/markets/${regionId}/types/`, {
        params: {
          page: page,
          datasource: datasource
        },
        timeout: 5000 // 设置5秒超时
      });
      
      console.log(`Received ${response.data.length} type IDs for region ID ${regionId}, page ${page}`);
      return response.data;
    } catch (error) {
      // 检查是否是页码超出范围的错误
      if (error.response?.status === 500 && error.response?.data?.error?.includes('Requested page does not exist')) {
        console.log(`Page ${page} does not exist for region ${regionId}, stopping pagination`);
        return []; // 返回空数组表示没有更多数据
      }
      
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Timeout fetching market region types for region ID ${regionId}, page ${page}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getMarketRegionTypes(regionId, page, retries - 1);
      } else {
        console.error(`Error fetching market region types for region ID ${regionId}, page ${page}: ${error.message}`);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    }
  }

  async getAllMarketRegionTypesRecursively(regionId, startPage = 1, callback, datasource = 'serenity') {
    try {
      let page = startPage;
      let hasMoreData = true;
      
      console.log(`Starting recursive fetch of market types for region ${regionId} from page ${startPage}`);
      
      while (hasMoreData) {
        console.log(`Fetching market types for region ${regionId} from page ${page}...`);
        const typeIds = await this.getMarketRegionTypes(regionId, page, datasource);
        
        console.log(`Type IDs for region ${regionId}, page ${page}:`, typeIds.slice(0, 10), typeIds.length > 10 ? '...' : '');
        
        if (typeIds.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // 调用回调函数处理当前页的数据
        if (callback && typeof callback === 'function') {
          console.log(`Calling callback with ${typeIds.length} items from page ${page}`);
          await callback(typeIds, page);
        }
        
        page++;
      }
      
      console.log(`Finished fetching all market types for region ${regionId}`);
      return page - 1; // 返回总页数
    } catch (error) {
      console.error(`Error in recursive fetching of market types for region ${regionId}:`, error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async getAllRegionsRecursively(startPage = 1, callback, idsOnly = false, datasource = 'serenity') {
    try {
      let page = startPage;
      let hasMoreData = true;
      
      console.log('Starting recursive fetch of regions from page', startPage);
      
      while (hasMoreData) {
        console.log(`Fetching regions from page ${page}...`);
        const regionIds = await this.getRegionIds(page, datasource);
        
        console.log(`Region IDs for page ${page}:`, regionIds.slice(0, 10), regionIds.length > 10 ? '...' : '');
        
        if (regionIds.length === 0) {
          hasMoreData = false;
          break;
        }
        
        let processedData = [];
        
        if (idsOnly) {
          // 如果只需要ID，直接使用regionIds
          processedData = regionIds;
          console.log(`Retrieved ${regionIds.length} region IDs from page ${page}`);
        } else {
          // 否则请求详细信息
          // 不再使用Promise.all并发请求，而是串行请求以配合节流控制
          const regionDetails = [];
          console.log(`Starting to fetch details for ${regionIds.length} region IDs from page ${page}`);
          let processedIds = 0;
          for (const id of regionIds) {
            processedIds++;
            if (processedIds % 10 === 0) {
              console.log(`Processed ${processedIds} out of ${regionIds.length} region IDs from page ${page}`);
            }
            const details = await this.getRegionDetails(id, datasource);
            if (details) {
              regionDetails.push(details);
            } else {
              console.log(`Skipping region ID ${id} due to null details`);
            }
          }
          
          processedData = regionDetails;
          console.log(`Fetched ${regionDetails.length} valid regions from page ${page}`);
        }
        
        // 调用回调函数处理当前页的数据
        if (callback && typeof callback === 'function') {
          console.log(`Calling callback with ${processedData.length} items from page ${page}`);
          await callback(processedData, page);
        }
        
        page++;
      }
      
      console.log('Finished fetching all regions');
      return page - 1; // 返回总页数
    } catch (error) {
      console.error('Error in recursive fetching of regions:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // System-related methods
  async getSystemIds(page = 1, datasource = 'serenity', retries = 3) {
    try {
      console.log(`Sending request to /universe/systems/?page=${page}&datasource=${datasource}`);
      const response = await this.client.get(`/universe/systems/`, {
        params: {
          page: page,
          datasource: datasource
        },
        timeout: 10000 // 设置10秒超时
      });
      console.log(`Received ${response.data.length} system IDs from page ${page}`);
      return response.data;
    } catch (error) {
      // 检查是否是页码超出范围的错误（API返回500并提示"Requested page does not exist!"）
      if (error.response?.status === 500 && error.response?.data?.error?.includes('Requested page does not exist')) {
        console.log(`Page ${page} does not exist, stopping pagination`);
        return []; // 返回空数组表示没有更多数据
      }
      
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Error fetching system IDs for page ${page}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getSystemIds(page, retries - 1);
      } else {
        console.error('Error fetching system IDs:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    }
  }

  async getSystemDetails(systemId, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      console.log(`Throttling request for system ID ${systemId}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      console.log(`Sending request for system details: /universe/systems/${systemId}/?datasource=${datasource}&language=zh`);
      const response = await this.client.get(`/universe/systems/${systemId}/`, {
        params: {
          datasource: datasource,
          language: process.env.EVE_API_LANGUAGE
        },
        timeout: 15000 // 增加超时时间到15秒
      });
      
      console.log(`Received details for system ID ${systemId}: ${response.data.name || 'Unknown'}`);
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Timeout fetching system details for ID ${systemId}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getSystemDetails(systemId, retries - 1);
      } else {
        console.error(`Error fetching system details for ID ${systemId}: ${error.message}`);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        // 不再重试，返回null表示获取失败，但不中断整个同步过程
        return null;
      }
    }
  }

  async getAllSystemsRecursively(startPage = 1, callback, idsOnly = false, datasource = 'serenity') {
    try {
      let page = startPage;
      let hasMoreData = true;
      
      console.log('Starting recursive fetch of systems from page', startPage);
      
      while (hasMoreData) {
        console.log(`Fetching systems from page ${page}...`);
        const systemIds = await this.getSystemIds(page, datasource);
        
        console.log(`System IDs for page ${page}:`, systemIds.slice(0, 10), systemIds.length > 10 ? '...' : '');
        
        if (systemIds.length === 0) {
          hasMoreData = false;
          break;
        }
        
        let processedData = [];
        
        if (idsOnly) {
          // 如果只需要ID，直接使用systemIds
          processedData = systemIds;
          console.log(`Retrieved ${systemIds.length} system IDs from page ${page}`);
        } else {
          // 否则请求详细信息
          // 不再使用Promise.all并发请求，而是串行请求以配合节流控制
          const systemDetails = [];
          console.log(`Starting to fetch details for ${systemIds.length} system IDs from page ${page}`);
          let processedIds = 0;
          for (const id of systemIds) {
            processedIds++;
            if (processedIds % 10 === 0) {
              console.log(`Processed ${processedIds} out of ${systemIds.length} system IDs from page ${page}`);
            }
            const details = await this.getSystemDetails(id, datasource);
            if (details) {
              systemDetails.push(details);
            } else {
              console.log(`Skipping system ID ${id} due to null details`);
            }
          }
          
          processedData = systemDetails;
          console.log(`Fetched ${systemDetails.length} valid systems from page ${page}`);
        }
        
        // 调用回调函数处理当前页的数据
        if (callback && typeof callback === 'function') {
          console.log(`Calling callback with ${processedData.length} items from page ${page}`);
          await callback(processedData, page);
        }
        
        page++;
      }
      
      console.log('Finished fetching all systems');
      return page - 1; // 返回总页数
    } catch (error) {
      console.error('Error in recursive fetching of systems:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async getMarketOrdersByRegionAndType(regionId, typeId, orderType = 'all', page = 1, datasource = 'serenity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      console.log(`Throttling request for market orders: regionId=${regionId}, typeId=${typeId}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      const params = {
        page: page,
        datasource: datasource,
        type_id: typeId
      };

      // 根据订单类型添加筛选参数
      if (orderType === 'buy') {
        params.buy = '1';
      } else if (orderType === 'sell') {
        params.buy = '0';
      }

      let response;
      // 欧服使用不同的API端点
      if (datasource.toLowerCase() === 'tranquility') {
        const fullUrl = `https://esi.evetech.net/latest/markets/${regionId}/orders/`;
        console.log(`Sending request to EVE Tech API for market orders: ${fullUrl}?page=${page}&type_id=${typeId}&datasource=${datasource}`);
        response = await axios.get(fullUrl, {
          params: {
            page: page,
            type_id: typeId,
            buy: params.buy
          },
          headers: {
            'Accept': 'application/json',
            'Accept-Language': '',
            'If-None-Match': '',
            'X-Compatibility-Date': '2025-12-16',
            'X-Tenant': ''
          },
          timeout: 5000 // 设置5秒超时
        });
      } else {
        console.log(`Sending request for market orders: /markets/${regionId}/orders/?page=${page}&type_id=${typeId}&datasource=${datasource}`);
        response = await this.client.get(`/markets/${regionId}/orders/`, {
          params: params,
          timeout: 5000 // 设置5秒超时
        });
      }
      
      console.log(`Received ${response.data.length} orders for region ID ${regionId}, type ID ${typeId}, page ${page}`);
      // Transform order data to map 'range' to 'order_range'
      return response.data.map(order => ({
        order_id: order.order_id,
        region_id: parseInt(regionId),
        type_id: parseInt(typeId),
        is_buy_order: order.is_buy_order,
        price: parseFloat(order.price),
        volume_remaining: order.volume_remain,
        volume_total: order.volume_total,
        minimum_volume: order.min_volume,
        order_range: order.range,
        location_id: order.location_id,
        duration: order.duration,
        issued: order.issued
      }));
    } catch (error) {
      // 检查是否是页码超出范围的错误
      if ((error.response?.status === 500 || error.response?.status === 404) && 
          error.response?.data?.error?.includes('page does not exist')) {
        console.log(`Page ${page} does not exist for orders: regionId=${regionId}, typeId=${typeId}, stopping pagination`);
        return []; // 返回空数组表示没有更多数据
      }
      
      if (error.response?.status === 420) {
        // 420状态码：ESI API请求被屏蔽，需要长时间等待
        console.error(`API request blocked (420) for region ID ${regionId}, type ID ${typeId}, page ${page}`);
        console.error('Response data:', error.response.data);
        // 被屏蔽时，抛出特殊错误，让上层处理
        throw new Error(`API_BLOCKED: ${JSON.stringify(error.response.data)}`);
      } else if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Timeout fetching market orders for region ID ${regionId}, type ID ${typeId}, page ${page}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getMarketOrdersByRegionAndType(regionId, typeId, orderType, page, datasource, retries - 1);
      } else {
        console.error(`Error fetching market orders for region ID ${regionId}, type ID ${typeId}, page ${page}: ${error.message}`);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    }
  }

  async getAllMarketOrdersByRegionAndType(regionId, typeId, orderType = 'all', callback, datasource = 'serenity') {
    try {
      let page = 1;
      let hasMoreData = true;
      let allOrders = [];
      
      console.log(`Starting to fetch all market orders for region ${regionId}, type ${typeId}, orderType ${orderType}`);
      
      while (hasMoreData) {
        const orders = await this.getMarketOrdersByRegionAndType(regionId, typeId, orderType, page, datasource);
        
        if (orders.length === 0) {
          hasMoreData = false;
          break;
        }
        
        allOrders = allOrders.concat(orders);
        
        // 调用回调函数处理当前页的数据
        if (callback && typeof callback === 'function') {
          await callback(orders, page);
        }
        
        // 添加 50ms 延迟，避免被 API 服务器限流
        await new Promise(resolve => setTimeout(resolve, 50));
        
        page++;
      }
      
      console.log(`Finished fetching all market orders for region ${regionId}, type ${typeId}`);
      return allOrders;
    } catch (error) {
      console.error(`Error in fetching all market orders for region ${regionId}, type ${typeId}:`, error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // 获取所有星系击毁统计数据
  async getSystemKills(datasource = 'serenity', retries = 3) {
    try {
      let response;
      
      // 为不同数据源使用正确的基础URL
      let apiBaseUrl;
      let headers = {};
      
      if (datasource.toLowerCase() === 'tranquility') {
        // 欧服使用官方API
        apiBaseUrl = 'https://esi.evetech.net';
        headers = {
          'Accept': 'application/json',
          'X-Compatibility-Date': '2025-12-16'
        };
      } else {
        // 晨曦和曙光使用ALI ESI API
        apiBaseUrl = process.env.EVE_API_BASE_URL || 'https://ali-esi.evepc.163.com';
      }
      
      // 构建完整URL，包含API版本
      const fullUrl = `${apiBaseUrl}/${process.env.EVE_API_VERSION || 'latest'}/universe/system_kills/?datasource=${datasource}`;
      console.log(`Sending request for system kills: ${fullUrl}`);
      
      // 统一使用axios进行请求，确保一致的错误处理
      response = await axios.get(fullUrl, {
        headers: { ...headers, ...this.client.defaults.headers },
        timeout: 20000 // 增加超时时间到20秒
      });
      
      console.log(`Received ${response.data.length} system kills data`);
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Error fetching system kills, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getSystemKills(datasource, retries - 1);
      } else {
        console.error('Error fetching system kills:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw error;
      }
    }
  }

  // 获取星门详情
  async getStargateDetails(stargateId, systemId, datasource = 'infinity', retries = 3) {
    // 节流控制：确保每1秒只请求1次
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.throttleInterval) {
      const waitTime = this.throttleInterval - timeSinceLastRequest;
      console.log(`Throttling request for stargate ID ${stargateId} in system ${systemId}, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      let apiBaseUrl;
      let headers = {};
      
      if (datasource.toLowerCase() === 'tranquility') {
        // 欧服使用官方API
        apiBaseUrl = 'https://esi.evetech.net';
        headers = {
          'Accept': 'application/json',
          'X-Compatibility-Date': '2025-12-16'
        };
      } else {
        // 晨曦和曙光使用ALI ESI API
        apiBaseUrl = process.env.EVE_API_BASE_URL || 'https://ali-esi.evepc.163.com';
      }
      
      // 构建完整URL，包含API版本
      const fullUrl = `${apiBaseUrl}/${process.env.EVE_API_VERSION || 'latest'}/universe/stargates/${stargateId}/?datasource=${datasource}`;
      console.log(`Sending request for stargate details: ${fullUrl}`);
      
      // 统一使用axios进行请求，确保一致的错误处理
      const response = await axios.get(fullUrl, {
        headers: { ...headers, ...this.client.defaults.headers },
        timeout: 10000 // 设置10秒超时
      });
      
      console.log(`Received details for stargate ID ${stargateId} in system ${systemId}: ${response.data.name || 'Unknown'}`);
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        // 如果是超时或连接重置错误，进行重试
        console.log(`Timeout fetching stargate details for ID ${stargateId} in system ${systemId}, retrying (${retries} left)...`);
        // 指数退避策略，每次重试等待时间增加
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
        return this.getStargateDetails(stargateId, systemId, datasource, retries - 1);
      } else {
        console.error(`Error fetching stargate details for ID ${stargateId} in system ${systemId}: ${error.message}`);
        if (error.response) {
          console.error(`Response status for stargate ID ${stargateId} in system ${systemId}:`, error.response.status);
          console.error(`Response data for stargate ID ${stargateId} in system ${systemId}:`, error.response.data);
        }
        
        // 对于404错误，抛出错误以便上层处理
        if (error.response && error.response.status === 404) {
          throw error;
        }
        
        // 对于其他错误，返回null表示获取失败，但不中断整个同步过程
        return null;
      }
    }
  }
}

module.exports = new EveApiService();