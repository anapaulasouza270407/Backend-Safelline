const { v4: uuidv4 } = require('uuid');

// Filas por categoria (em memória para P2P dinâmico)
const waitingQueues = {
  jogos: [],
  series: [],
  filmes: []
};
const activeRooms = new Map();

class MatchingService {
  joinQueue(userId, socketId, category) {
    console.log(`📥 joinQueue called: userId=${userId}, category=${category}`);
    
    // Validação de entrada
    if (!userId || !socketId || !category) {
      throw new Error('userId, socketId e category são obrigatórios');
    }

    // Remove user from all queues if already exists
    this.leaveAllQueues(userId);

    // Check if there's someone waiting in this category
    const queue = waitingQueues[category];
    if (!queue) {
      console.log(`❌ Invalid category: ${category}`);
      throw new Error('Invalid category');
    }

    console.log(`📊 Current queue for ${category}:`, queue.length, 'users waiting');

    if (queue.length > 0) {
      // Match found!
      const partner = queue.shift();
      const roomId = uuidv4();
      
      console.log(`🎯 Match found! Partner: ${partner.userId}, Room: ${roomId}`);
      
      // Create room
      const room = {
        id: roomId,
        category,
        user1Id: partner.userId,
        user2Id: userId,
        user1SocketId: partner.socketId,
        user2SocketId: socketId,
        status: 'active',
        createdAt: new Date()
      };
      
      activeRooms.set(roomId, room);
      console.log(`🏠 Room created:`, room);
      
      return {
        matched: true,
        roomId,
        category,
        partnerId: partner.userId,
        partnerSocketId: partner.socketId
      };
    } else {
      // Add to queue
      const queueItem = {
        userId,
        socketId,
        timestamp: Date.now()
      };
      
      queue.push(queueItem);
      console.log(`⏳ Added to queue. Position: ${queue.length}`);
      
      return {
        matched: false,
        category,
        queuePosition: queue.length,
        estimatedWait: this.calculateEstimatedWait(queue.length)
      };
    }
  }

  leaveQueue(userId, category = null) {
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    if (category) {
      const queue = waitingQueues[category];
      if (queue) {
        const index = queue.findIndex(item => item.userId === userId);
        if (index > -1) {
          queue.splice(index, 1);
          console.log(`✅ User ${userId} removed from ${category} queue`);
          return true;
        }
      }
    } else {
      this.leaveAllQueues(userId);
      return true;
    }
    return false;
  }

  leaveAllQueues(userId) {
    if (!userId) {
      console.warn('userId não fornecido para leaveAllQueues');
      return;
    }

    Object.keys(waitingQueues).forEach(category => {
      const queue = waitingQueues[category];
      const index = queue.findIndex(item => item.userId === userId);
      if (index > -1) {
        queue.splice(index, 1);
      }
    });
  }

  getRoom(roomId) {
    if (!roomId) {
      throw new Error('roomId é obrigatório');
    }
    return activeRooms.get(roomId);
  }

  getUserRoom(userId) {
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    return Array.from(activeRooms.values()).find(
      room => room.user1Id === userId || room.user2Id === userId
    );
  }

  leaveRoom(roomId, userId) {
    if (!roomId || !userId) {
      throw new Error('roomId e userId são obrigatórios');
    }

    const room = activeRooms.get(roomId);
    if (room) {
      // Validar que o usuário está na sala
      if (room.user1Id !== userId && room.user2Id !== userId) {
        throw new Error('Usuário não pertence a esta sala');
      }

      // Remove room completely (P2P dinâmico)
      activeRooms.delete(roomId);
      
      // Get partner info before deleting
      const partnerId = room.user1Id === userId ? room.user2Id : room.user1Id;
      const partnerSocketId = room.user1Id === userId ? room.user2SocketId : room.user1SocketId;
      
      console.log(`🚪 Room ${roomId} closed by user ${userId}`);
      
      return {
        ...room,
        partnerId,
        partnerSocketId,
        status: 'ended',
        endedAt: new Date()
      };
    }
    return null;
  }

  calculateEstimatedWait(queuePosition) {
    if (typeof queuePosition !== 'number' || queuePosition < 0) {
      return '0s';
    }

    const avgWaitTime = 15; // seconds
    const estimatedSeconds = queuePosition * avgWaitTime;
    
    if (estimatedSeconds < 60) {
      return `${estimatedSeconds}s`;
    } else {
      return `${Math.ceil(estimatedSeconds / 60)}m`;
    }
  }

  getQueueStats() {
    return {
      jogos: waitingQueues.jogos.length,
      series: waitingQueues.series.length,
      filmes: waitingQueues.filmes.length,
      activeRooms: activeRooms.size
    };
  }

  // Limpar salas inativas (cleanup)
  cleanupInactiveRooms() {
    const now = Date.now();
    const maxInactiveTime = 5 * 60 * 1000; // 5 minutos
    
    for (const [roomId, room] of activeRooms.entries()) {
      if (now - room.createdAt.getTime() > maxInactiveTime) {
        console.log(`🗑️ Removing inactive room: ${roomId}`);
        activeRooms.delete(roomId);
      }
    }
  }
}

module.exports = new MatchingService();