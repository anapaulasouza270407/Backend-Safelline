const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const {
  updateAvatar,
  updateProfile,
  getUserProfile,
  deleteUser
} = require('../controllers/user.controller');

const router = express.Router();

// 🔐 protege todas as rotas abaixo
router.use(authMiddleware);

// 👤 perfil
router.get('/profile', getUserProfile);

// 🖼 avatar
router.put('/avatar', updateAvatar);

// ✏️ profile
router.put('/profile', updateProfile);

// ❌ delete
router.delete('/profile', deleteUser);

module.exports = router;