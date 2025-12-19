const LoyaltyOffer = require('../models/LoyaltyOffer');
const eveApiService = require('../services/eveApiService');

class LoyaltyController {
  // 同步特定公司的忠诚度商店商品
  static async syncLoyaltyOffers(req, res) {
    try {
      const { corporationId } = req.body;
      
      if (!corporationId) {
        return res.status(400).json({ message: 'corporationId is required' });
      }

      // 直接返回成功给前端，任务在后台执行
      res.status(202).json({
        message: `Loyalty offers synchronization for corporation ${corporationId} has started in background`,
        status: 'started'
      });

      // 在后台异步执行同步
      (async () => {
        try {
          console.log(`Starting loyalty offers synchronization for corporation ${corporationId} in background...`);
          
          // 从EVE API获取忠诚度商店商品
          const loyaltyOffers = await eveApiService.getLoyaltyStoreOffers(corporationId);
          
          let totalOffers = loyaltyOffers.length;
          let processedOffers = 0;
          let insertedOffers = 0;
          let updatedOffers = 0;
          
          console.log(`Fetched ${totalOffers} loyalty offers from API`);
          
          // 插入或更新到数据库
          for (const offer of loyaltyOffers) {
            try {
              // 准备数据，添加corporationId
              const offerData = {
                offer_id: offer.offer_id,
                corporation_id: corporationId,
                type_id: offer.type_id,
                quantity: offer.quantity,
                lp_cost: offer.lp_cost,
                isk_cost: offer.isk_cost,
                ak_cost: offer.ak_cost || 0,
                required_items: offer.required_items
              };
              
              const result = await LoyaltyOffer.insertOrUpdate(offerData);
              
              if (result.insertId) {
                insertedOffers++;
              } else {
                updatedOffers++;
              }
              
              processedOffers++;
              
              if (processedOffers % 10 === 0) {
                console.log(`Progress: ${processedOffers}/${totalOffers} loyalty offers processed`);
              }
            } catch (dbError) {
              console.error(`Error processing loyalty offer ${offer.offer_id}:`, dbError.message);
            }
          }
          
          console.log(`Loyalty offers synchronization completed for corporation ${corporationId}`);
          console.log(`Results: ${insertedOffers} inserted, ${updatedOffers} updated, ${totalOffers - processedOffers} failed`);
        } catch (error) {
          console.error(`Error in background syncing loyalty offers for corporation ${corporationId}:`, error.message);
          console.error('Error stack:', error.stack);
        }
      })();
    } catch (error) {
      console.error('Error starting loyalty offers sync:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 获取所有忠诚度商店商品（带分页）
  static async getLoyaltyOffers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const corporationId = req.query.corporationId ? parseInt(req.query.corporationId) : null;
      
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      let offers;
      let total;
      
      if (corporationId) {
        // 按公司筛选
        offers = await LoyaltyOffer.findAll(page, limit, '', corporationId);
        total = offers.total;
      } else {
        // 获取所有
        offers = await LoyaltyOffer.findAll(page, limit);
        total = offers.total;
      }
      
      // 计算总页数
      const totalPages = Math.ceil(total / limit);
      
      res.status(200).json({
        data: offers.offers,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: offers.totalPages
        }
      });
    } catch (error) {
      console.error('Error getting loyalty offers:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 获取单个忠诚度商店商品详情
  static async getLoyaltyOfferById(req, res) {
    try {
      const { id } = req.params;
      
      const offer = await LoyaltyOffer.findById(id);
      
      if (!offer) {
        return res.status(404).json({ message: 'Loyalty offer not found' });
      }
      
      res.status(200).json(offer);
    } catch (error) {
      console.error(`Error getting loyalty offer ${req.params.id}:`, error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 创建忠诚度商店商品
  static async createLoyaltyOffer(req, res) {
    try {
      const offerData = req.body;
      
      const result = await LoyaltyOffer.insertOrUpdate(offerData);
      
      res.status(201).json({
        message: 'Loyalty offer created successfully',
        offerId: result.insertId || offerData.id
      });
    } catch (error) {
      console.error('Error creating loyalty offer:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 更新忠诚度商店商品
  static async updateLoyaltyOffer(req, res) {
    try {
      const { id } = req.params;
      const offerData = req.body;
      
      // 确保ID一致
      offerData.id = id;
      
      const result = await LoyaltyOffer.insertOrUpdate(offerData);
      
      res.status(200).json({
        message: 'Loyalty offer updated successfully',
        offerId: id
      });
    } catch (error) {
      console.error(`Error updating loyalty offer ${req.params.id}:`, error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 删除忠诚度商店商品
  static async deleteLoyaltyOffer(req, res) {
    try {
      const { id } = req.params;
      
      const result = await LoyaltyOffer.delete(id);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Loyalty offer not found' });
      }
      
      res.status(200).json({ message: 'Loyalty offer deleted successfully' });
    } catch (error) {
      console.error(`Error deleting loyalty offer ${req.params.id}:`, error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = LoyaltyController;
