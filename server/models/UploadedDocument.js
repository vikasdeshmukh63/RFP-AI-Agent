import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UploadedDocument = sequelize.define('UploadedDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Generated filename'
  },
  original_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Original filename from user'
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Local file path'
  },
  file_url: {
    type: DataTypes.STRING(500),
    comment: 'Public URL to access file'
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  size_bytes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  uploaded_from: {
    type: DataTypes.ENUM('chatbot', 'analysis', 'synopsis', 'unknown'),
    defaultValue: 'unknown',
    comment: 'Source module that uploaded the file'
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
  tableName: 'uploaded_documents',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['uploaded_from']
    },
    {
      fields: ['mime_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
UploadedDocument.prototype.getFileSize = function() {
  return {
    bytes: this.size_bytes,
    kb: Math.round(this.size_bytes / 1024),
    mb: Math.round(this.size_bytes / (1024 * 1024))
  };
};

UploadedDocument.prototype.isImage = function() {
  return this.mime_type.startsWith('image/');
};

UploadedDocument.prototype.isPDF = function() {
  return this.mime_type === 'application/pdf';
};

UploadedDocument.prototype.isOfficeDocument = function() {
  return this.mime_type.includes('officedocument') || 
         this.mime_type.includes('msword') || 
         this.mime_type.includes('ms-excel');
};

// Class methods
UploadedDocument.findByUser = async function(userId, options = {}) {
  return this.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    ...options
  });
};

UploadedDocument.findByUploadSource = async function(userId, uploadedFrom, options = {}) {
  return this.findAll({
    where: { 
      user_id: userId,
      uploaded_from: uploadedFrom 
    },
    order: [['created_at', 'DESC']],
    ...options
  });
};

UploadedDocument.getTotalSizeByUser = async function(userId) {
  const result = await this.findOne({
    where: { user_id: userId },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('size_bytes')), 'total_size'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_count']
    ],
    raw: true
  });
  
  return {
    total_size: parseInt(result.total_size) || 0,
    total_count: parseInt(result.total_count) || 0
  };
};

export default UploadedDocument;