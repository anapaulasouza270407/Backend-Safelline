const bcrypt = require('bcryptjs');
const database = require('../database/database');
const authService = require('../services/auth.service');

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('❌ getUserProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil'
    });
  }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatar } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'Avatar é obrigatório'
      });
    }

    await database.query(
      'UPDATE users SET avatar = $1 WHERE id = $2',
      [avatar, userId]
    );

    return res.json({
      success: true,
      message: 'Avatar atualizado com sucesso',
      avatar
    });
  } catch (error) {
    console.error('❌ updateAvatar error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar avatar'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, email, password } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!username && !email && !password) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos um campo é obrigatório'
      });
    }

    let passwordHash = password;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    await database.query(
      `
      UPDATE users
      SET
        username = COALESCE($1, username),
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      `,
      [username || null, email || null, passwordHash || null, userId]
    );

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('❌ updateProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await database.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });
  } catch (error) {
    console.error('❌ deleteUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao deletar usuário'
    });
  }
};

module.exports = {
  getUserProfile,
  updateAvatar,
  updateProfile,
  deleteUser
};