const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  totalChartsAnalyzed: { type: Number, default: 0 },
  totalSignalsGenerated: { type: Number, default: 0 },
  callSignals: { type: Number, default: 0 },
  putSignals: { type: Number, default: 0 },
  noSignals: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  creditsConsumed: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Get or create today's analytics
analyticsSchema.statics.getToday = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await this.findOne({ date: today });
  
  if (!analytics) {
    analytics = await this.create({ date: today });
  }
  
  return analytics;
};

// Increment chart analysis
analyticsSchema.statics.incrementChartAnalysis = async function(signalType) {
  const today = await this.getToday();
  
  today.totalChartsAnalyzed += 1;
  today.totalSignalsGenerated += 1;
  today.creditsConsumed += 1;
  
  if (signalType === 'CALL') today.callSignals += 1;
  else if (signalType === 'PUT') today.putSignals += 1;
  else today.noSignals += 1;
  
  await today.save();
  return today;
};

module.exports = mongoose.model('Analytics', analyticsSchema);
