import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Synopsis = sequelize.define('Synopsis', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tender_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  customer_name: {
    type: DataTypes.STRING
  },
  submission_date: {
    type: DataTypes.DATEONLY
  },
  prebid_meeting: {
    type: DataTypes.DATE
  },
  prebid_query_submission_date: {
    type: DataTypes.DATEONLY
  },
  consultant_name: {
    type: DataTypes.STRING
  },
  consultant_email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  help_desk: {
    type: DataTypes.STRING
  },
  tender_fee: {
    type: DataTypes.DECIMAL(15, 2),
    validate: {
      min: 0
    }
  },
  tender_emd: {
    type: DataTypes.DECIMAL(15, 2),
    validate: {
      min: 0
    }
  },
  branches: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0
    }
  },
  cbs_software: {
    type: DataTypes.TEXT
  },
  dc: {
    type: DataTypes.TEXT,
    comment: 'Data Center requirements'
  },
  dr: {
    type: DataTypes.TEXT,
    comment: 'Disaster Recovery requirements'
  },
  rfp_document_url: {
    type: DataTypes.STRING(500)
  },
  rfp_document_name: {
    type: DataTypes.STRING
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'synopsis',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['tender_name']
    },
    {
      fields: ['customer_name']
    },
    {
      fields: ['submission_date']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Synopsis.prototype.hasDocument = function() {
  return !!this.rfp_document_url;
};

Synopsis.prototype.isSubmissionDue = function(days = 7) {
  if (!this.submission_date) return false;
  
  const submissionDate = new Date(this.submission_date);
  const today = new Date();
  const diffTime = submissionDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= days && diffDays >= 0;
};

Synopsis.prototype.getFinancialSummary = function() {
  return {
    tender_fee: this.tender_fee ? parseFloat(this.tender_fee) : 0,
    tender_emd: this.tender_emd ? parseFloat(this.tender_emd) : 0,
    total_cost: (this.tender_fee ? parseFloat(this.tender_fee) : 0) + 
                (this.tender_emd ? parseFloat(this.tender_emd) : 0)
  };
};

Synopsis.prototype.toExportFormat = function() {
  return {
    'Tender Name': this.tender_name,
    'Customer Name': this.customer_name || 'Not specified',
    'Submission Date': this.submission_date || 'Not specified',
    'Pre-bid Meeting': this.prebid_meeting || 'Not specified',
    'Pre-bid Query Date': this.prebid_query_submission_date || 'Not specified',
    'Consultant Name': this.consultant_name || 'Not specified',
    'Consultant Email': this.consultant_email || 'Not specified',
    'Help Desk': this.help_desk || 'Not specified',
    'Tender Fee': this.tender_fee ? `₹${parseFloat(this.tender_fee).toLocaleString()}` : 'Not specified',
    'Tender EMD': this.tender_emd ? `₹${parseFloat(this.tender_emd).toLocaleString()}` : 'Not specified',
    'Branches': this.branches || 'Not specified',
    'CBS Software': this.cbs_software || 'Not specified',
    'DC Requirements': this.dc || 'Not specified',
    'DR Requirements': this.dr || 'Not specified',
    'RFP Document': this.rfp_document_name || 'Not specified'
  };
};

// Class methods
Synopsis.findByUser = async function(userId, options = {}) {
  return this.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Synopsis.searchByUser = async function(userId, query, options = {}) {
  const { Op } = sequelize.Sequelize;
  
  return this.findAll({
    where: {
      user_id: userId,
      [Op.or]: [
        { tender_name: { [Op.iLike]: `%${query}%` } },
        { customer_name: { [Op.iLike]: `%${query}%` } },
        { consultant_name: { [Op.iLike]: `%${query}%` } },
        { cbs_software: { [Op.iLike]: `%${query}%` } }
      ]
    },
    order: [
      [sequelize.literal(`
        CASE 
          WHEN LOWER(tender_name) LIKE LOWER('%${query}%') THEN 1
          WHEN LOWER(customer_name) LIKE LOWER('%${query}%') THEN 2
          ELSE 3
        END
      `)],
      ['created_at', 'DESC']
    ],
    ...options
  });
};

Synopsis.getUpcomingDeadlines = async function(userId, days = 7) {
  const { Op } = sequelize.Sequelize;
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  return this.findAll({
    where: {
      user_id: userId,
      submission_date: {
        [Op.between]: [today, futureDate]
      }
    },
    order: [['submission_date', 'ASC']]
  });
};

Synopsis.getStatsByUser = async function(userId) {
  const stats = await this.findOne({
    where: { user_id: userId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_synopsis'],
      [sequelize.fn('COUNT', sequelize.col('submission_date')), 'with_submission_date'],
      [sequelize.fn('COUNT', sequelize.col('tender_fee')), 'with_tender_fee'],
      [sequelize.fn('COUNT', sequelize.col('rfp_document_url')), 'with_documents'],
      [sequelize.fn('AVG', sequelize.col('tender_fee')), 'avg_tender_fee'],
      [sequelize.fn('SUM', sequelize.col('tender_fee')), 'total_tender_fee'],
      [sequelize.fn('MIN', sequelize.col('submission_date')), 'earliest_submission'],
      [sequelize.fn('MAX', sequelize.col('submission_date')), 'latest_submission']
    ],
    raw: true
  });
  
  return {
    total_synopsis: parseInt(stats.total_synopsis) || 0,
    with_submission_date: parseInt(stats.with_submission_date) || 0,
    with_tender_fee: parseInt(stats.with_tender_fee) || 0,
    with_documents: parseInt(stats.with_documents) || 0,
    avg_tender_fee: parseFloat(stats.avg_tender_fee) || 0,
    total_tender_fee: parseFloat(stats.total_tender_fee) || 0,
    earliest_submission: stats.earliest_submission,
    latest_submission: stats.latest_submission
  };
};

export default Synopsis;