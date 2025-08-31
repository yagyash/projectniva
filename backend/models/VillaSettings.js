const mongoose = require('mongoose');

const villaSettingsSchema = new mongoose.Schema({
  pricePerNight: { type: Number, default: 250 },
  maxGuests: { type: Number, default: 8 },
  cleaningFee: { type: Number, default: 50 },
  taxRate: { type: Number, default: 0.12 },
  minStayNights: { type: Number, default: 2 },
  unavailableDates: [{ type: Date }],
  seasonalPricing: [{
    startDate: Date,
    endDate: Date,
    pricePerNight: Number,
    description: String
  }]
});

module.exports = mongoose.model('VillaSettings', villaSettingsSchema);