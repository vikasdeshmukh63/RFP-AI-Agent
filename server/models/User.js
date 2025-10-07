import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      isESDSEmail(value) {
        if (!value.endsWith('@esds.co.in')) {
          throw new Error('Email must be from @esds.co.in domain');
        }
      }
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['email']
    }
  ]
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

// Class methods
User.hashPassword = async function(password) {
  return bcrypt.hash(password, 10);
};

User.findByEmail = async function(email) {
  return this.findOne({ where: { email } });
};

// Hooks
User.beforeCreate(async (user) => {
  if (user.password_hash) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password_hash')) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

export default User;