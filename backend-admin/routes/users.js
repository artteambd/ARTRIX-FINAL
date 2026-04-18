const express = require('express');
const User = require('../models/User');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get users' 
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
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
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user' 
    });
  }
});

// Get user by license key
router.get('/by-license/:licenseKey', async (req, res) => {
  try {
    const user = await User.findOne({ 
      licenseKey: req.params.licenseKey 
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
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
    console.error('Get user by license error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user' 
    });
  }
});

// Create user (admin only)
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const { email, name, membership, credits, expiresAt, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email required' 
      });
    }
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    
    const licenseKey = User.generateLicenseKey();
    
    const user = await User.create({
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      password: password || null,
      licenseKey,
      membership: membership || 'free',
      credits: credits || 5,
      expiresAt: expiresAt || null,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: 'User created',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        licenseKey: user.licenseKey,
        membership: user.membership,
        credits: user.credits,
        expiresAt: user.expiresAt,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create user' 
    });
  }
});

// Update user credits (admin only)
router.patch('/:id/credits', verifyAdminToken, async (req, res) => {
  try {
    const { credits } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { credits: Number(credits) },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Credits updated',
      user 
    });
  } catch (error) {
    console.error('Update credits error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update credits' 
    });
  }
});

// Update user membership (admin only)
router.patch('/:id/membership', verifyAdminToken, async (req, res) => {
  try {
    const { membership, credits, expiresAt } = req.body;
    
    const updateData = { membership };
    if (credits !== undefined) updateData.credits = credits;
    if (expiresAt) updateData.expiresAt = new Date(expiresAt);
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Membership updated',
      user 
    });
  } catch (error) {
    console.error('Update membership error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update membership' 
    });
  }
});

// Block/unblock user (admin only)
router.patch('/:id/block', verifyAdminToken, async (req, res) => {
  try {
    const { isBlocked, blockReason } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isBlocked: Boolean(isBlocked),
        blockReason: blockReason || ''
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: isBlocked ? 'User blocked' : 'User unblocked',
      user 
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update block status' 
    });
  }
});

// Extend license (admin only)
router.patch('/:id/extend', verifyAdminToken, async (req, res) => {
  try {
    const { days, expiresAt } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    let newExpiry;
    if (expiresAt) {
      newExpiry = new Date(expiresAt);
    } else if (days) {
      const currentExpiry = user.expiresAt ? new Date(user.expiresAt) : new Date();
      newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + Number(days));
    }
    
    if (newExpiry) {
      user.expiresAt = newExpiry;
      await user.save();
    }
    
    res.json({ 
      success: true, 
      message: 'License extended',
      user: {
        _id: user._id,
        expiresAt: user.expiresAt
      }
    });
  } catch (error) {
    console.error('Extend license error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to extend license' 
    });
  }
});

// Delete user (admin only)
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'User deleted' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user' 
    });
  }
});

module.exports = router;
