const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Booking = require('../models/Booking');
const VillaSettings = require('../models/VillaSettings');
const Gallery = require('../models/Gallery');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      Booking.deleteMany({}),
      VillaSettings.deleteMany({}),
      Gallery.deleteMany({})
    ]);

    const vs = new VillaSettings({
      pricePerNight: 275, maxGuests: 8, cleaningFee: 75, taxRate: 0.125, minStayNights: 2,
      unavailableDates: [ new Date('2025-12-24'), new Date('2025-12-25') ],
      seasonalPricing: [ { startDate: new Date('2025-11-15'), endDate: new Date('2026-01-15'), pricePerNight: 350, description: 'Holiday Season' } ]
    });
    await vs.save();

    await Gallery.insertMany([
      { title: 'Villa Exterior', description: 'Stone villa in mountains', imageUrl: '/images/exterior-1.jpg', category: 'exterior', order: 1 },
      { title: 'Mountain View', description: 'Vistas from terrace', imageUrl: '/images/view-1.jpg', category: 'view', order: 2 },
      { title: 'Master Bedroom', description: 'Rustic beams', imageUrl: '/images/bedroom-1.jpg', category: 'bedroom', order: 3 }
    ]);

    await Booking.insertMany([
      { guestName: 'John Smith', email: 'john@example.com', phone: '+1-555-0123', checkIn: new Date('2025-09-15'), checkOut: new Date('2025-09-18'), guests: 4, totalPrice: 950, status: 'confirmed', paymentStatus: 'paid' }
    ]);

    console.log('Database seeded.');
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) seed();
module.exports = seed;