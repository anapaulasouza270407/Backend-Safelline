const matchingService = require('../services/matching.service');

class MatchingController {
  async joinQueue(req, res) {
    try {
      const { category } = req.body;
      const userId = req.user.userId;
      
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category é obrigatória'
        });
      }
      
      if (!['jogos', 'series', 'filmes'].includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Use: jogos, series, filmes'
        });
      }

      res.json({
        success: true,
        message: 'Use WebSocket for real-time matching',
        category
      });
    } catch (error) {
      console.error('❌ joinQueue error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async leaveQueue(req, res) {
    try {
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
      
      matchingService.leaveAllQueues(userId);
      
      res.json({
        success: true,
        message: 'Left all queues'
      });
    } catch (error) {
      console.error('❌ leaveQueue error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getQueueStats(req, res) {
    try {
      const stats = matchingService.getQueueStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ getQueueStats error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new MatchingController();