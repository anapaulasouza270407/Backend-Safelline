const jwt = require('jsonwebtoken');
const matchingService = require('./matching.service');
const authService = require('./auth.service');
const { v4: uuidv4 } = require('uuid');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(io) {
    this.io = io;

    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('authenticate', async (data) => {
        console.log(`🔑 Authentication attempt for socket: ${socket.id}`);
        try {
          // Validação de entrada
          if (!data || !data.token) {
            throw new Error('Token não fornecido');
          }

          const decoded = jwt.verify(data.token, process.env.JWT_SECRET);

          socket.userId = decoded.userId;
          this.connectedUsers.set(decoded.userId, socket.id);

          await authService.setUserOnline(decoded.userId, true);

          socket.emit('authenticated', { userId: decoded.userId });
          console.log(`✅ User authenticated: ${decoded.userId}`);
        } catch (error) {
          console.log(`❌ Auth failed for socket ${socket.id}:`, error.message);
          socket.emit('auth_error', { message: 'Invalid token' });
        }
      });

      socket.on('find-match', async (data) => {
        console.log(`🔍 User ${socket.userId} looking for match in category: ${data?.category}`);

        if (!socket.userId) {
          console.log('❌ User not authenticated');
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Validação de dados
        if (!data || !data.category) {
          socket.emit('error', { message: 'Category é obrigatória' });
          return;
        }

        const { category } = data;

        if (!['jogos', 'series', 'filmes', 'games', 'movies', 'shows'].includes(category)) {
          console.log(`❌ Invalid category: ${category}`);
          socket.emit('error', { message: 'Invalid category. Use: jogos, series, filmes' });
          return;
        }

        const categoryMap = {
          'games': 'jogos',
          'movies': 'filmes',
          'shows': 'series'
        };

        const mappedCategory = categoryMap[category] || category;

        try {
          const result = matchingService.joinQueue(socket.userId, socket.id, mappedCategory);
          console.log(`📊 Queue result:`, result);

          if (result.matched) {
            console.log(`✅ Match found! Room: ${result.roomId}`);

            const user1 = await authService.getUserById(socket.userId);
            const user2 = await authService.getUserById(result.partnerId);

            const partnerSocket = this.io.sockets.sockets.get(result.partnerSocketId);

            socket.emit('match-found', {
              roomId: result.roomId,
              category: result.category,
              partner: { username: user2?.username || 'Usuário' }
            });

            if (partnerSocket) {
              partnerSocket.emit('match-found', {
                roomId: result.roomId,
                category: result.category,
                partner: { username: user1?.username || 'Usuário' }
              });
            }
          } else {
            console.log(`⏳ Added to queue. Position: ${result.queuePosition}`);

            socket.emit('queue-status', {
              category: mappedCategory,
              position: result.queuePosition,
              estimatedWait: result.estimatedWait
            });
          }
        } catch (error) {
          console.log(`❌ Error in find-match:`, error.message);
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('cancel-matching', (data) => {
        if (socket.userId) {
          matchingService.leaveAllQueues(socket.userId);
          socket.emit('matching-cancelled', { success: true });
        }
      });

      socket.on('join-room', (data) => {
        // Validação de dados
        if (!data || !data.roomId) {
          socket.emit('error', { message: 'roomId é obrigatório' });
          return;
        }

        const room = matchingService.getRoom(data.roomId);

        if (room && (room.user1Id === socket.userId || room.user2Id === socket.userId)) {
          socket.join(data.roomId);
          socket.currentRoom = data.roomId;
          socket.emit('room-joined', { roomId: data.roomId });
        } else {
          socket.emit('error', { message: 'Acesso negado a esta sala' });
        }
      });

      socket.on('send-message', async (data) => {
        if (!socket.currentRoom || !socket.userId) {
          socket.emit('error', { message: 'Você não está em uma sala' });
          return;
        }

        // Validação de mensagem
        if (!data || !data.message || data.message.trim() === '') {
          socket.emit('error', { message: 'Mensagem não pode estar vazia' });
          return;
        }

        try {
          const sender = await authService.getUserById(socket.userId);
          const senderUsername = sender?.username || 'Usuário';

          const message = {
            id: uuidv4(),
            message: data.message.trim(),
            senderId: socket.userId,
            timestamp: new Date()
          };

          socket.to(socket.currentRoom).emit('new-message', {
            id: message.id,
            message: message.message,
            username: senderUsername,
            timestamp: message.timestamp
          });
        } catch (error) {
          console.log(`❌ Error sending message:`, error.message);
          socket.emit('error', { message: 'Erro ao enviar mensagem' });
        }
      });

      socket.on('typing_start', () => {
        if (socket.currentRoom) {
          socket.to(socket.currentRoom).emit('partner_typing', { isTyping: true });
        }
      });

      socket.on('typing_stop', () => {
        if (socket.currentRoom) {
          socket.to(socket.currentRoom).emit('partner_typing', { isTyping: false });
        }
      });

      socket.on('leave-room', (data) => {
        console.log(`👋 User ${socket.userId} leaving room ${data?.roomId}`);
        this.handleLeaveRoom(socket, data?.roomId);
      });

      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.id}`);

        if (socket.userId) {
          try {
            await authService.setUserOnline(socket.userId, false);
            matchingService.leaveAllQueues(socket.userId);
            this.connectedUsers.delete(socket.userId);
            this.handleLeaveRoom(socket, socket.currentRoom, true);
          } catch (error) {
            console.log(`❌ Error during disconnect:`, error.message);
          }
        }
      });
    });

    setInterval(() => {
      matchingService.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
  }

  handleLeaveRoom(socket, roomId = null, isDisconnect = false) {
    const targetRoom = roomId || socket.currentRoom;

    if (targetRoom) {
      console.log(`🚪 Handling leave room: ${targetRoom}, disconnect: ${isDisconnect}`);

      try {
        const roomData = matchingService.leaveRoom(targetRoom, socket.userId);

        if (roomData) {
          console.log(`📢 Notifying partner about user leaving room ${targetRoom}`);

          socket.to(targetRoom).emit('partner_left', {
            roomId: targetRoom,
            message: isDisconnect ? 'Seu parceiro se desconectou' : 'Seu parceiro saiu da conversa'
          });

          if (roomData.partnerSocketId) {
            const partnerSocket = this.io.sockets.sockets.get(roomData.partnerSocketId);

            if (partnerSocket) {
              console.log(`🔄 Auto-reconnecting partner ${roomData.partnerId}`);
              partnerSocket.currentRoom = null;

              partnerSocket.emit('partner_disconnected', {
                message: 'Procurando nova pessoa...'
              });

              setTimeout(() => {
                if (partnerSocket.userId) {
                  console.log(`🔍 Starting new search for partner in category: ${roomData.category}`);

                  try {
                    const result = matchingService.joinQueue(partnerSocket.userId, partnerSocket.id, roomData.category);

                    if (result.matched) {
                      const newPartnerSocket = this.io.sockets.sockets.get(result.partnerSocketId);

                      partnerSocket.emit('match-found', {
                        roomId: result.roomId,
                        category: result.category,
                        partner: { username: 'Usuário' }
                      });

                      if (newPartnerSocket) {
                        newPartnerSocket.emit('match-found', {
                          roomId: result.roomId,
                          category: result.category,
                          partner: { username: 'Usuário' }
                        });
                      }
                    } else {
                      partnerSocket.emit('queue-status', {
                        category: result.category,
                        position: result.queuePosition,
                        estimatedWait: result.estimatedWait
                      });
                    }
                  } catch (error) {
                    console.log(`❌ Error during auto-reconnect:`, error.message);
                  }
                }
              }, 1000);
            }
          }
        }

        socket.leave(targetRoom);
        socket.currentRoom = null;
      } catch (error) {
        console.log(`❌ Error leaving room:`, error.message);
      }
    }
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }
}

module.exports = new WebSocketService();