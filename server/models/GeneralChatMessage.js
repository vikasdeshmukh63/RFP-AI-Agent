import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GeneralChatMessage = sequelize.define('GeneralChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'References ChatSession.session_id'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sender: {
    type: DataTypes.ENUM('user', 'ai'),
    allowNull: false
  },
  file_url: {
    type: DataTypes.STRING(500),
    comment: 'Associated document URL'
  },
  file_name: {
    type: DataTypes.STRING,
    comment: 'Associated document name'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  created_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_date'
  }
}, {
  tableName: 'general_chat_messages',
  timestamps: false, // Using custom created_date field
  indexes: [
    {
      fields: ['session_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['created_date']
    },
    {
      fields: ['sender']
    }
  ]
});

// Instance methods
GeneralChatMessage.prototype.isFromUser = function() {
  return this.sender === 'user';
};

GeneralChatMessage.prototype.isFromAI = function() {
  return this.sender === 'ai';
};

GeneralChatMessage.prototype.hasAttachment = function() {
  return !!this.file_url;
};

// Class methods
GeneralChatMessage.findBySession = async function(sessionId, userId, options = {}) {
  return this.findAll({
    where: { 
      session_id: sessionId,
      user_id: userId 
    },
    order: [['created_date', 'ASC']],
    ...options
  });
};

GeneralChatMessage.getConversationHistory = async function(sessionId, userId, limit = 10) {
  return this.findAll({
    where: { 
      session_id: sessionId,
      user_id: userId 
    },
    order: [['created_date', 'DESC']],
    limit,
    attributes: ['message', 'sender', 'created_date']
  });
};

GeneralChatMessage.countBySession = async function(sessionId, userId) {
  return this.count({
    where: { 
      session_id: sessionId,
      user_id: userId 
    }
  });
};

GeneralChatMessage.deleteBySession = async function(sessionId, userId) {
  return this.destroy({
    where: { 
      session_id: sessionId,
      user_id: userId 
    }
  });
};

GeneralChatMessage.getRecentSessions = async function(userId, limit = 10) {
  return this.findAll({
    where: { user_id: userId },
    attributes: [
      'session_id',
      [sequelize.fn('MAX', sequelize.col('created_date')), 'last_message_at'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'message_count']
    ],
    group: ['session_id'],
    order: [[sequelize.fn('MAX', sequelize.col('created_date')), 'DESC']],
    limit,
    raw: true
  });
};

export default GeneralChatMessage;