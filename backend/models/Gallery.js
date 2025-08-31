const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: String,
  description: String,
  imageUrl: String,
  category: { type: String, enum: ['exterior','interior','bedroom','bathroom','kitchen','view'], default: 'interior' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Gallery', gallerySchema);