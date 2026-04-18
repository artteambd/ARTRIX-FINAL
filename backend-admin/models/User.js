const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const warningSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'critical', 'broadcast'], default: 'info' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: null
  },
  name: {
    type: String,
    default: ''
  },
  licenseKey: {
    type: String,
    unique: true,
    sparse: true
  },
  membership: {
    type: String,
    enum: ['free', 'nano', 'starter', 'popular', 'expert', 'investor'],
    default: 'free'
  },
  credits: {
    type: Number,
    default: 5
  },
  creditsUsed: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    default: ''
  },
  expiresAt: {
    type: Date,
    default: null
  },
  lastActiveAt: {
    type: Date,
    default: null
  },
  signalsToday: {
    type: Number,
    default: 0
  },
  totalSignals: {
    type: Number,
    default: 0
  },
  lastSignalDate: {
    type: Date,
    default: null
  },
  deviceFingerprint: {
    type: String,
    default: null
  },
  warnings: [warningSchema],
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Reset daily signals
userSchema.methods.resetDailySignals = function() {
  const today = new Date().toDateString();
  const lastSignal = this.lastSignalDate ? this.lastSignalDate.toDateString() : null;
  if (lastSignal !== today) {
    this.signalsToday = 0;
  }
};

// Check if license expired
userSchema.methods.isLicenseExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
};

// Generate license key
userSchema.statics.generateLicenseKey = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 5; i++) {
    let segment = '';
    for (let j = 0; j < 5; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join('-');
};

module.exports = mongoose.model('User', userSchema);
