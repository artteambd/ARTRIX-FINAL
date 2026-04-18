const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Initialize default admin on first request
let adminInitialized = false;
const initAdmin = async () => {
  if (adminInitialized) return;
  
  try {
    const existingAdmin = await Admin.findOne({ username: process.env.ADMIN_USERNAME || 'admin' });
    if (!existingAdmin) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'ARBDXCHART123'
      });
      console.log('✅ Default admin created');
    }
    adminInitialized = true;
  } catch (error) {
    console.error('Admin init error:', error);
  }
};

// Admin Login
router.post('/login', async (req, res) => {
  try {
    await initAdmin();
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password required' 
      });
    }
    
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    admin.lastLoginAt = new Date();
    await admin.save();
    
    const token = jwt.sign(
      { id: admin._id, username: admin.username, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true, 
      token,
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Verify admin token
router.get('/verify', verifyAdminToken, (req, res) => {
  res.json({ 
    success: true, 
    admin: req.admin 
  });
});

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, deviceFingerprint } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }
    
    // Create new user with 5 free credits
    const licenseKey = User.generateLicenseKey();
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name: name || email.split('@')[0],
      licenseKey,
      membership: 'free',
      credits: 5,
      deviceFingerprint,
      isActive: true
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        licenseKey: user.licenseKey,
        membership: user.membership,
        credits: user.credits,
        isActive: user.isActive,
        isBlocked: user.isBlocked,
        expiresAt: user.expiresAt,
        warnings: user.warnings,
        signalsToday: user.signalsToday,
        totalSignals: user.totalSignals,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
});

// User Login
router.post('/user-login', async (req, res) => {
  try {
    const { email, password, deviceFingerprint } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is blocked. Contact support.' 
      });
    }
    
    // Update last active and device fingerprint
    user.lastActiveAt = new Date();
    if (deviceFingerprint) {
      user.deviceFingerprint = deviceFingerprint;
    }
    user.resetDailySignals();
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        licenseKey: user.licenseKey,
        membership: user.membership,
        credits: user.credits,
        isActive: user.isActive,
        isBlocked: user.isBlocked,
        expiresAt: user.expiresAt,
        warnings: user.warnings,
        signalsToday: user.signalsToday,
        totalSignals: user.totalSignals,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
});

module.exports = router;
