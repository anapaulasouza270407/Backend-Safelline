const express = require('express');

const router = express.Router();

const authMiddleware =
  require('../middlewares/auth.middleware');

const {
  updateAvatar,
  updateProfile
} = require('../controllers/user.controller');

// ALTERAR AVATAR
router.put(
  '/avatar',
  authMiddleware,
  updateAvatar
);

// ALTERAR PERFIL
router.put(
  '/profile',
  authMiddleware,
  updateProfile
);

module.exports = router;