const matchingService = require('../services/matching.service');
const authService = require('../services/auth.service');

class ChatController {
  async getRooms(req, res) {
    try {
      const userId = req.user.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const room = matchingService.getUserRoom(userId);
      
      const formattedRooms = room ? [{
        id: room.id,
        category: room.category,
        status: room.status,
        partner: {
          username: 'Anônimo'
        },
        createdAt: room.createdAt
      }] : [];

      res.json({
        success: true,
        data: {
          rooms: formattedRooms
        }
      });
    } catch (error) {
      console.error('❌ getRooms error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getRoomMessages(req, res) {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'roomId é obrigatório'
        });
      }
      
      const room = matchingService.getRoom(roomId);
      
      if (!room || (room.user1Id !== req.user.userId && room.user2Id !== req.user.userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this room'
        });
      }

      res.json({
        success: true,
        data: {
          messages: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            hasMore: false
          }
        }
      });
    } catch (error) {
      console.error('❌ getRoomMessages error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const { roomId } = req.params;
      const { content } = req.body;
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'roomId é obrigatório'
        });
      }
      
      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Mensagem não pode estar vazia'
        });
      }
      
      const room = matchingService.getRoom(roomId);
      
      if (!room || (room.user1Id !== req.user.userId && room.user2Id !== req.user.userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this room'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Use WebSocket for real-time messaging'
      });
    } catch (error) {
      console.error('❌ sendMessage error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async leaveRoom(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.userId;
      
      if (!roomId) {
        return res.status(400).json({
          success: false,
          message: 'roomId é obrigatório'
        });
      }
      
      const room = matchingService.leaveRoom(roomId, userId);
      
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      res.json({
        success: true,
        message: 'Left chat room successfully'
      });
    } catch (error) {
      console.error('❌ leaveRoom error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ChatController();