const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const messages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    next();
  };
};

const schemas = {
  register: Joi.object({
    username: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.pattern.base': 'Username deve conter apenas letras, números, _ ou -',
        'string.min': 'Username deve ter no mínimo 3 caracteres',
        'string.max': 'Username deve ter no máximo 50 caracteres'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Senha deve ter no mínimo 6 caracteres',
        'any.required': 'Senha é obrigatória'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Senha é obrigatória'
      })
  }),

  message: Joi.object({
    content: Joi.string()
      .min(1)
      .max(500)
      .required()
      .trim()
      .messages({
        'string.min': 'Mensagem não pode estar vazia',
        'string.max': 'Mensagem não pode ter mais de 500 caracteres',
        'any.required': 'Conteúdo da mensagem é obrigatório'
      })
  }),

  joinQueue: Joi.object({
    category: Joi.string()
      .valid('jogos', 'series', 'filmes')
      .required()
      .messages({
        'any.only': 'Category deve ser: jogos, series ou filmes',
        'any.required': 'Category é obrigatória'
      })
  })
};

module.exports = {
  validate,
  schemas
};