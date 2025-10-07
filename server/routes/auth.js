import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', validateRequest(schemas.register), async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Additional domain validation
    if (!email.endsWith('@esds.co.in')) {
      return res.status(400).json({ 
        error: 'Registration is restricted to @esds.co.in email addresses only' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create user (password will be hashed automatically by the model hook)
    const user = await User.create({
      email,
      password_hash: password, // Will be hashed by beforeCreate hook
      name
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(), // This excludes password_hash
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', validateRequest(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Additional domain validation
    if (!email.endsWith('@esds.co.in')) {
      return res.status(401).json({ 
        error: 'Login is restricted to @esds.co.in email addresses only' 
      });
    }

    // Find user (include password_hash for validation)
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'name', 'role', 'password_hash']
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    await user.update({ updated_at: new Date() });

    res.json({
      message: 'Login successful',
      user: user.toJSON(), // This excludes password_hash
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'name', 'role', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ name: name.trim() });

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user with password
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'password_hash']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password (will be hashed by beforeUpdate hook)
    await user.update({ password_hash: newPassword });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new token
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;