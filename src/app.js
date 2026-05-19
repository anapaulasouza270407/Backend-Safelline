require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const database = require('./database/database');
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const matchingRoutes = require('./routes/matching.routes');
const userRoutes = require('./routes/user.routes');
const websocketService = require('./services/websocket.service');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

database.connect().catch(err => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});

app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  limit: '10mb',
  extended: true
}));

try {
  const swaggerDocument = YAML.load(
    path.join(__dirname, '../docs/swagger.yaml')
  );

  app.get('/docs', (_req, res) => {
    res.sendFile(
      path.join(__dirname, '../docs/index.html')
    );
  });

  app.get('/docs/swagger.yaml', (_req, res) => {
    res.sendFile(
      path.join(__dirname, '../docs/swagger.yaml')
    );
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'MeetStranger API Documentation'
    })
  );
} catch (error) {
  console.warn('⚠️ Swagger documentation not available:', error.message);
}

app.get('/api/', (_req, res) => {
  res.json({
    message: 'MeetStranger API',
    version: '2.0.0',
    status: 'running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      websocket: 'active'
    }
  });
});

websocketService.initialize(io);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    await database.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }

  process.exit(0);
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ WebSocket server ready`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/docs`);
    console.log(`🗄️  Database: PostgreSQL`);
  });
}

module.exports = app;