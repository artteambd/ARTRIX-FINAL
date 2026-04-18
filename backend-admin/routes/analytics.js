const express = require('express');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Log signal (public endpoint)
router.post('/signal', async (req, res) => {
  try {
    const { licenseKey, pair, signal, confidence, mode } = req.body;
    
    if (licenseKey) {
      const user = await User.findOne({ licenseKey });
      if (user) {
        user.totalSignals += 1;
        user.signalsToday += 1;
        user.lastSignalDate = new Date();
        user.lastActiveAt = new Date();
        await user.save();
      }
    }
    
    // Update analytics
    const signalType = signal?.toUpperCase() || 'UNKNOWN';
    await Analytics.incrementChartAnalysis(signalType);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Log signal error:', error);
    res.json({ success: false });
  }
});

// Get dashboard analytics (admin only)
router.get('/dashboard', verifyAdminToken, async (req, res) => {
  try {
    // Get today's analytics
    const todayAnalytics = await Analytics.getToday();
    
    // Get user stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true, isBlocked: false });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    
    // Get users active today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = await User.countDocuments({
      lastActiveAt: { $gte: today }
    });
    
    // Get total signals today
    const totalSignalsToday = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$signalsToday' } } }
    ]);
    
    // Get total signals all time
    const totalSignalsAllTime = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$totalSignals' } } }
    ]);
    
    // Get membership distribution
    const membershipStats = await User.aggregate([
      { $group: { _id: '$membership', count: { $sum: 1 } } }
    ]);
    
    const usersByMembership = {};
    membershipStats.forEach(stat => {
      usersByMembership[stat._id] = stat.count;
    });
    
    // Get new users today
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Get last 7 days analytics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const weeklyAnalytics = await Analytics.find({
      date: { $gte: sevenDaysAgo }
    }).sort({ date: 1 });
    
    res.json({
      success: true,
      dashboard: {
        today: {
          chartsAnalyzed: todayAnalytics.totalChartsAnalyzed,
          signalsGenerated: todayAnalytics.totalSignalsGenerated,
          callSignals: todayAnalytics.callSignals,
          putSignals: todayAnalytics.putSignals,
          noSignals: todayAnalytics.noSignals,
          creditsConsumed: todayAnalytics.creditsConsumed,
          newUsers: newUsersToday,
          activeUsers: activeToday
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: blockedUsers,
          activeToday,
          byMembership: usersByMembership
        },
        signals: {
          today: totalSignalsToday[0]?.total || 0,
          allTime: totalSignalsAllTime[0]?.total || 0
        },
        weekly: weeklyAnalytics
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get analytics' 
    });
  }
});

// Get analytics for date range (admin only)
router.get('/range', verifyAdminToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate) query.date = { $gte: new Date(startDate) };
    if (endDate) {
      query.date = query.date || {};
      query.date.$lte = new Date(endDate);
    }
    
    const analytics = await Analytics.find(query).sort({ date: -1 });
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Range analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get analytics' 
    });
  }
});

module.exports = router;
