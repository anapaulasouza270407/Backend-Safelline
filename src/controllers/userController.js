const database =
  require('../database/database');

// ===============================
// ALTERAR AVATAR
// ===============================

const updateAvatar = async (req, res) => {

  try {

    const userId = req.user.id;

    const { avatar } = req.body;

    await database.query(
      `
      UPDATE users
      SET avatar = $1
      WHERE id = $2
      `,
      [avatar, userId]
    );

    return res.json({
      success: true,
      avatar
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar avatar'
    });

  }

};

// ===============================
// ALTERAR PERFIL
// ===============================

const updateProfile = async (req, res) => {

  try {

    const userId = req.user.id;

    const {
      username,
      email,
      password
    } = req.body;

    await database.query(
      `
      UPDATE users
      SET
        username = $1,
        email = $2,
        password = $3
      WHERE id = $4
      `,
      [
        username,
        email,
        password,
        userId
      ]
    );

    return res.json({
      success: true
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil'
    });

  }

};

module.exports = {
  updateAvatar,
  updateProfile
};