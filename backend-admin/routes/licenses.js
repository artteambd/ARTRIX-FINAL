const express = require('express');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Verify license (public endpoint - called from frontend)
router.post('/verify', async (req, res) => {
  try {
    const { licenseKey, device_fingerprint, device_info } = req.body;
    
    if (!licenseKey) {
      return res.json({ 
        valid: false, 
        status: false,
        message: 'License key required' 
      });
    }
    
    const user = await User.findOne({ licenseKey });
    
    if (!user) {
      return res.json({ 
        valid: false, 
        status: false,
        message: 'License not found' 
      });
    }
    
    if (user.isBlocked) {
      return res.json({ 
        valid: false, 
        status: false,
        message: 'License has been blocked' 
      });
    }
    
    if (!user.isActive) {
      return res.json({ 
        valid: false, 
        status: false,
        message: 'License is not active' 
      });
    }
    
    // Check expiry
    if (user.expiresAt && new Date() > new Date(user.expiresAt)) {
      return res.json({ 
        valid: false, 
        status: false,
        message: 'License has expired' 
      });
    }
    
    // Check device lock (only for premium users with existing device)
    if (user.membership !== 'free' && user.deviceFingerprint && device_fingerprint) {
      if (user.deviceFingerprint !== device_fingerprint) {
        return res.json({
          valid: false,
          status: false,
          deviceLocked: true,
          message: 'License is locked to another device'
        });
      }
    }
    
    // Update device fingerprint if not set
    if (!user.deviceFingerprint && device_fingerprint) {
      user.deviceFingerprint = device_fingerprint;
    }
    
    user.lastActiveAt = new Date();
    user.resetDailySignals();
    await user.save();
    
    res.json({
      valid: true,
      status: 'active',
      user_email: user.email,
      name: user.name,
      membership: user.membership,
      tier: user.membership,
      credits: user.credits,
      expiry_date: user.expiresAt,
      deviceLocked: false
    });
  } catch (error) {
    console.error('License verify error:', error);
    res.json({ 
      valid: false, 
      status: false,
      error: 'License verification failed' 
    });
  }
});

// Activate license for existing user
router.post('/activate', async (req, res) => {
  try {
    const { userId, licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'License key required' 
      });
    }
    
    // Find the license/user by license key
    const licenseUser = await User.findOne({ licenseKey });
    
    if (!licenseUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid license key' 
      });
    }
    
    if (licenseUser.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: 'License is blocked' 
      });
    }
    
    if (licenseUser.expiresAt && new Date() > new Date(licenseUser.expiresAt)) {
      return res.status(403).json({ 
        success: false, 
        message: 'License has expired' 
      });
    }
    
    res.json({
      success: true,
      message: 'License activated',
      user: {
        _id: licenseUser._id,
        email: licenseUser.email,
        name: licenseUser.name,
        licenseKey: licenseUser.licenseKey,
        membership: licenseUser.membership,
        credits: licenseUser.credits,
        expiresAt: licenseUser.expiresAt
      }
    });
  } catch (error) {
    console.error('License activate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Activation failed' 
    });
  }
});

// Use credit (deduct from user)
router.post('/use-credit', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.json({ 
        success: false, 
        message: 'License key required' 
      });
    }
    
    const user = await User.findOne({ licenseKey });
    
    if (!user) {
      return res.json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    if (user.isBlocked || !user.isActive) {
      return res.json({ 
        success: false, 
        message: 'Account is not active' 
      });
    }
    
    if (user.credits <= 0) {
      return res.json({ 
        success: false, 
        message: 'No credits remaining',
        remainingCredits: 0
      });
    }
    
    // Deduct credit
    user.credits -= 1;
    user.creditsUsed += 1;
    user.totalSignals += 1;
    user.signalsToday += 1;
    user.lastSignalDate = new Date();
    user.lastActiveAt = new Date();
    await user.save();
    
    // Update analytics
    await Analytics.incrementChartAnalysis('SIGNAL');
    
    res.json({
      success: true,
      message: 'Credit used',
      remainingCredits: user.credits
    });
  } catch (error) {
    console.error('Use credit error:', error);
    res.json({ 
      success: false, 
      message: 'Failed to use credit' 
    });
  }
});

// Get license stats (admin only)
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true, isBlocked: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const expiredUsers = await User.countDocuments({
      expiresAt: { $lt: new Date() }
    });
    
    const membershipStats = await User.aggregate([
      {
        $group: {
          _id: '$membership',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const usersByMembership = {};
    membershipStats.forEach(stat => {
      usersByMembership[stat._id] = stat.count;
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        expiredUsers,
        usersByMembership
      }
    });
  } catch (error) {
    console.error('License stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get stats' 
    });
  }
});

module.exports = router;
