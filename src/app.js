// ===============================
// IMPORTAÇÕES E CONFIGURAÇÕES INICIAIS
// ===============================

require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// ===============================
// IMPORTAÇÕES INTERNAS
// ===============================

const database = require('./database/database');

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const matchingRoutes = require('./routes/matching.routes');
const userRoutes = require('./routes/user.routes');

const websocketService = require('./services/websocket.service');

// ===============================
// INICIALIZAÇÃO DO SERVIDOR
// ===============================

const app = express();

const server = http.createServer(app);

// ===============================
// SOCKET.IO
// ===============================

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

// ===============================
// BANCO DE DADOS
// ===============================

database.connect().catch(console.error);

// ===============================
// CONFIGURAÇÕES EXPRESS
// ===============================

app.set('trust proxy', 1);

// ===============================
// MIDDLEWARES
// ===============================

app.use(helmet());

app.use(cors({
  origin: "*"
}));

app.use(express.json({
  limit: '10mb'
}));

// ===============================
// SWAGGER / DOCUMENTAÇÃO
// ===============================

const swaggerDocument = YAML.load(
  path.join(__dirname, '../docs/swagger.yaml')
);

// Página customizada docs
app.get('/docs', (_req, res) => {
  res.sendFile(
    path.join(__dirname, '../docs/index.html')
  );
});

// Swagger yaml
app.get('/docs/swagger.yaml', (_req, res) => {
  res.sendFile(
    path.join(__dirname, '../docs/swagger.yaml')
  );
});

// Swagger UI padrão
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MeetStranger API Documentation'
  })
);

// ===============================
// ROTA PRINCIPAL
// ===============================

app.get('/api/', (_req, res) => {
  res.json({
    message: 'MeetStranger API',
    version: '2.0.0',
    status: 'running'
  });
});

// ===============================
// ROTAS DA API
// ===============================

// AUTH
app.use('/api/auth', authRoutes);

// CHAT
app.use('/api/chat', chatRoutes);

// MATCHING
app.use('/api/matching', matchingRoutes);

// USERS
app.use('/api/users', userRoutes);

// ===============================
// HEALTH CHECK
// ===============================

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

// ===============================
// WEBSOCKET
// ===============================

websocketService.initialize(io);

// ===============================
// TRATAMENTO GLOBAL DE ERROS
// ===============================

app.use((err, _req, res, _next) => {

  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });

});

// ===============================
// ENCERRAMENTO SEGURO
// ===============================

process.on('SIGINT', async () => {

  console.log('\n Shutting down gracefully...');

  await database.close();

  process.exit(0);

});

// ===============================
// INICIALIZAÇÃO DO SERVIDOR
// ===============================

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {

  server.listen(PORT, () => {

    console.log(` Server running on port ${PORT}`);

    console.log(` WebSocket server ready`);

    console.log(
      ` API Documentation: http://localhost:${PORT}/docs`
    );

    console.log(` Database: PostgreSQL`);

  });

}

// ===============================
// EXPORTAÇÃO
// ===============================

module.exports = app;