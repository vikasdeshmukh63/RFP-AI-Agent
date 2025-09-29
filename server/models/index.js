import sequelize from '../config/database.js';
import User from './User.js';
import UploadedDocument from './UploadedDocument.js';
import ChatSession from './ChatSession.js';
import GeneralChatMessage from './GeneralChatMessage.js';
import Synopsis from './Synopsis.js';
import AnalysisResult from './AnalysisResult.js';

// Define associations
User.hasMany(UploadedDocument, {
  foreignKey: 'user_id',
  as: 'documents',
  onDelete: 'CASCADE'
});

UploadedDocument.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(ChatSession, {
  foreignKey: 'user_id',
  as: 'chatSessions',
  onDelete: 'CASCADE'
});

ChatSession.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(GeneralChatMessage, {
  foreignKey: 'user_id',
  as: 'chatMessages',
  onDelete: 'CASCADE'
});

GeneralChatMessage.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Chat session and messages relationship (through session_id, not foreign key)
ChatSession.hasMany(GeneralChatMessage, {
  foreignKey: 'session_id',
  sourceKey: 'session_id',
  as: 'messages'
});

GeneralChatMessage.belongsTo(ChatSession, {
  foreignKey: 'session_id',
  targetKey: 'session_id',
  as: 'session'
});

User.hasMany(Synopsis, {
  foreignKey: 'user_id',
  as: 'synopsis',
  onDelete: 'CASCADE'
});

Synopsis.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(AnalysisResult, {
  foreignKey: 'user_id',
  as: 'analysisResults',
  onDelete: 'CASCADE'
});

AnalysisResult.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

UploadedDocument.hasMany(AnalysisResult, {
  foreignKey: 'document_id',
  as: 'analysisResults',
  onDelete: 'CASCADE'
});

AnalysisResult.belongsTo(UploadedDocument, {
  foreignKey: 'document_id',
  as: 'document'
});

// Export models and sequelize instance
export {
  sequelize,
  User,
  UploadedDocument,
  ChatSession,
  GeneralChatMessage,
  Synopsis,
  AnalysisResult
};

// Export default object with all models
export default {
  sequelize,
  User,
  UploadedDocument,
  ChatSession,
  GeneralChatMessage,
  Synopsis,
  AnalysisResult
};