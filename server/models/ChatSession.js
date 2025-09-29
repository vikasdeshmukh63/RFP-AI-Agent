import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChatSession = sequelize.define('ChatSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Frontend-generated session identifier'
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: 'New Chat'
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
  tableName: 'chat_sessions',
  indexes: [
    {
      unique: true,
      fields: ['session_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Class methods
ChatSession.findBySessionId = async function(sessionId, userId) {
  return this.findOne({
    where: { 
      session_id: sessionId,
      user_id: userId 
    }
  });
};

ChatSession.findByUser = async function(userId, options = {}) {
  return this.findAll({
    where: { user_id: userId },
    order: [['updated_at', 'DESC']],
    ...options
  });
};

ChatSession.createOrGet = async function(sessionId, userId, title = 'New Chat') {
  const [session, created] = await this.findOrCreate({
    where: { 
      session_id: sessionId,
      user_id: userId 
    },
    defaults: { title }
  });
  
  return { session, created };
};

export default ChatSession;