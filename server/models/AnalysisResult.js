import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AnalysisResult = sequelize.define('AnalysisResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  document_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'uploaded_documents',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  analysis_type: {
    type: DataTypes.ENUM('quick_rfp_analysis', 'custom_analysis', 'synopsis_analysis', 'comparison_analysis'),
    allowNull: false,
    defaultValue: 'quick_rfp_analysis'
  },
  questions: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Array of questions asked'
  },
  answers: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Object with question-answer pairs'
  },
  metadata: {
    type: DataTypes.JSONB,
    comment: 'Additional analysis metadata (processing time, model used, etc.)'
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
  tableName: 'analysis_results',
  indexes: [
    {
      fields: ['document_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['analysis_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
AnalysisResult.prototype.getQuestionCount = function() {
  return Array.isArray(this.questions) ? this.questions.length : 0;
};

AnalysisResult.prototype.getAnsweredCount = function() {
  if (!this.answers || typeof this.answers !== 'object') return 0;
  
  return Object.values(this.answers).filter(answer => 
    answer && 
    answer.trim() !== '' && 
    answer.toLowerCase() !== 'not specified in rfp'
  ).length;
};

AnalysisResult.prototype.getCompletionRate = function() {
  const total = this.getQuestionCount();
  const answered = this.getAnsweredCount();
  return total > 0 ? Math.round((answered / total) * 100) : 0;
};

AnalysisResult.prototype.exportToExcel = function() {
  const data = [];
  
  if (Array.isArray(this.questions) && this.answers) {
    this.questions.forEach((question, index) => {
      data.push({
        'Serial No': index + 1,
        'Question': question,
        'Answer': this.answers[question] || 'Not specified in RFP'
      });
    });
  }
  
  return data;
};

AnalysisResult.prototype.getAnswersByCategory = function() {
  // Categorize questions based on keywords
  const categories = {
    'Infrastructure': ['dc', 'dr', 'data center', 'disaster recovery', 'cloud', 'server'],
    'Users & Performance': ['users', 'concurrent', 'performance', 'uptime', 'load'],
    'Timeline': ['deadline', 'milestone', 'delivery', 'go live', 'submission', 'prebid'],
    'Financial': ['fee', 'emd', 'budget', 'cost', 'penalty', 'pbg'],
    'Security': ['security', 'audit', 'mfa', 'sso', 'ssl', 'authentication'],
    'Integration': ['payment', 'gateway', 'aadhaar', 'sms', 'email', 'api'],
    'Support': ['training', 'handholding', 'amc', 'maintenance', 'support'],
    'Technical': ['stack', 'technology', 'chatbot', 'ivr', 'database']
  };
  
  const categorized = {};
  
  Object.keys(categories).forEach(category => {
    categorized[category] = [];
  });
  
  if (Array.isArray(this.questions) && this.answers) {
    this.questions.forEach(question => {
      const lowerQuestion = question.toLowerCase();
      let assigned = false;
      
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
          categorized[category].push({
            question,
            answer: this.answers[question] || 'Not specified in RFP'
          });
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        if (!categorized['Other']) categorized['Other'] = [];
        categorized['Other'].push({
          question,
          answer: this.answers[question] || 'Not specified in RFP'
        });
      }
    });
  }
  
  // Remove empty categories
  Object.keys(categorized).forEach(category => {
    if (categorized[category].length === 0) {
      delete categorized[category];
    }
  });
  
  return categorized;
};

// Class methods
AnalysisResult.findByUser = async function(userId, options = {}) {
  return this.findAll({
    where: { user_id: userId },
    include: [{
      model: sequelize.models.UploadedDocument,
      as: 'document',
      attributes: ['id', 'original_name', 'mime_type', 'size_bytes']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

AnalysisResult.findByDocument = async function(documentId, userId, options = {}) {
  return this.findAll({
    where: { 
      document_id: documentId,
      user_id: userId 
    },
    order: [['created_at', 'DESC']],
    ...options
  });
};

AnalysisResult.findByType = async function(userId, analysisType, options = {}) {
  return this.findAll({
    where: { 
      user_id: userId,
      analysis_type: analysisType 
    },
    include: [{
      model: sequelize.models.UploadedDocument,
      as: 'document',
      attributes: ['id', 'original_name', 'mime_type']
    }],
    order: [['created_at', 'DESC']],
    ...options
  });
};

AnalysisResult.getStatsByUser = async function(userId) {
  const stats = await this.findAll({
    where: { user_id: userId },
    attributes: [
      'analysis_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('document_id'))), 'unique_documents']
    ],
    group: ['analysis_type'],
    raw: true
  });
  
  const totalStats = await this.findOne({
    where: { user_id: userId },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_analyses'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('document_id'))), 'unique_documents_analyzed']
    ],
    raw: true
  });
  
  return {
    overall: {
      total_analyses: parseInt(totalStats.total_analyses) || 0,
      unique_documents_analyzed: parseInt(totalStats.unique_documents_analyzed) || 0
    },
    by_type: stats.reduce((acc, stat) => {
      acc[stat.analysis_type] = {
        count: parseInt(stat.count),
        unique_documents: parseInt(stat.unique_documents)
      };
      return acc;
    }, {})
  };
};

AnalysisResult.getRecentActivity = async function(userId, limit = 10) {
  return this.findAll({
    where: { user_id: userId },
    include: [{
      model: sequelize.models.UploadedDocument,
      as: 'document',
      attributes: ['original_name', 'mime_type']
    }],
    order: [['created_at', 'DESC']],
    limit,
    attributes: ['id', 'analysis_type', 'created_at']
  });
};

export default AnalysisResult;