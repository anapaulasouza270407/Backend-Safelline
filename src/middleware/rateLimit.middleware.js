/**Tempo Limite para interação do usuario*/
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20, // Limite de 00 requisições por IP
    message: 'Too many requests from this IP, please try again after 5 minutes.',
    standardHeaders: true, // Retorna informações  de rate limit nos headers
});
const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // Limite de 100 mensagens por ip
    message: 'Too many messages sent from this IP, please try again after a minute.',
    standardHeaders: true,
});
const chatLimiter = rateLimit ({
    windowMs: 3 * 60 * 1000, // 3 minutos
    max: 50, // Limite de 50 conexões por IP
    message: 'Too many chat connections from this IP, please try again after a minute.',
    standardHeaders: true,
});
module.exports = {authLimiter, messageLimiter, chatLimiter};