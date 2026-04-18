const express = require('express');
const User = require('../models/User');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Get warnings by license key (public)
router.get('/license/:licenseKey', async (req, res) => {
  try {
    const user = await User.findOne({ 
      licenseKey: req.params.licenseKey 
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        warnings: [] 
      });
    }
    
    res.json({
      success: true,
      warnings: user.warnings || []
    });
  } catch (error) {
    console.error('Get warnings error:', error);
    res.json({ 
      success: false, 
      warnings: [] 
    });
  }
});

// Get notifications by user ID (public)
router.get('/user-notifications/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        notifications: [] 
      });
    }
    
    res.json({
      success: true,
      notifications: user.warnings || []
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.json({ 
      success: false, 
      notifications: [] 
    });
  }
});

// Mark warning as read by license key (public)
router.patch('/license/:licenseKey/:warningId/read', async (req, res) => {
  try {
    const user = await User.findOne({ 
      licenseKey: req.params.licenseKey 
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const warning = user.warnings.id(req.params.warningId);
    if (warning) {
      warning.isRead = true;
      await user.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Warning marked as read' 
    });
  } catch (error) {
    console.error('Mark warning read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark warning' 
    });
  }
});

// Mark notification as read by user ID (public)
router.patch('/user-notifications/:userId/:notificationId/read', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const warning = user.warnings.id(req.params.notificationId);
    if (warning) {
      warning.isRead = true;
      await user.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notification' 
    });
  }
});

// Send warning to user (admin only)
router.post('/send', verifyAdminToken, async (req, res) => {
  try {
    const { userId, message, type } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and message required' 
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    user.warnings.push({
      message,
      type: type || 'warning',
      isRead: false,
      createdAt: new Date()
    });
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Warning sent' 
    });
  } catch (error) {
    console.error('Send warning error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send warning' 
    });
  }
});

// Broadcast to all users (admin only)
router.post('/broadcast', verifyAdminToken, async (req, res) => {
  try {
    const { message, type } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message required' 
      });
    }
    
    const warning = {
      message,
      type: type || 'broadcast',
      isRead: false,
      createdAt: new Date()
    };
    
    await User.updateMany(
      {},
      { $push: { warnings: warning } }
    );
    
    const count = await User.countDocuments();
    
    res.json({ 
      success: true, 
      message: `Broadcast sent to ${count} users` 
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to broadcast' 
    });
  }
});

// Delete warning (admin only)
router.delete('/:userId/:warningId', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    user.warnings.pull({ _id: req.params.warningId });
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Warning deleted' 
    });
  } catch (error) {
    console.error('Delete warning error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete warning' 
    });
  }
});

module.exports = router;
