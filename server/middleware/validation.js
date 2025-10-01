import Joi from 'joi';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validation schemas
export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(100).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  chatMessage: Joi.object({
    session_id: Joi.string().required(),
    message: Joi.string().required(),
    sender: Joi.string().valid('user', 'ai').required(),
    file_url: Joi.string().optional().allow(null, ''),
    file_name: Joi.string().optional().allow(null, '')
  }),

  synopsis: Joi.object({
    tender_name: Joi.string().required(),
    customer_name: Joi.string().optional().allow(''),
    submission_date: Joi.date().optional().allow(null),
    prebid_meeting: Joi.date().optional().allow(null),
    prebid_query_submission_date: Joi.date().optional().allow(null),
    consultant_name: Joi.string().optional().allow(''),
    consultant_email: Joi.string().email().optional().allow(''),
    help_desk: Joi.string().optional().allow(''),
    tender_fee: Joi.number().optional().allow(null),
    tender_emd: Joi.number().optional().allow(null),
    branches: Joi.number().integer().optional().allow(null),
    cbs_software: Joi.string().optional().allow(''),
    dc: Joi.string().optional().allow(''),
    dr: Joi.string().optional().allow(''),
    rfp_document_url: Joi.string().uri().optional().allow(''),
    rfp_document_name: Joi.string().optional().allow('')
  })
};