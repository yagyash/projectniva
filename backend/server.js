// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config();

const Booking = require('./models/Booking');
const VillaSettings = require('./models/VillaSettings');
const Gallery = require('./models/Gallery');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/villa_niva', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// HEALTH
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// SETTINGS
app.get('/api/villa/settings', async (req, res) => {
  try {
    let settings = await VillaSettings.findOne();
    if (!settings) {
      settings = new VillaSettings();
      await settings.save();
    }
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/villa/settings', async (req, res) => {
  try {
    const settings = await VillaSettings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AVAILABILITY CHECK
app.post('/api/bookings/check-availability', async (req, res) => {
  try {
    const { checkIn, checkOut } = req.body;
    if (!checkIn || !checkOut) return res.status(400).json({ error: 'Check-in and check-out are required' });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) return res.status(400).json({ error: 'Check-out must be after check-in' });

    const conflictingBookings = await Booking.find({
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $lt: checkOutDate, $gte: checkInDate } },
        { checkOut: { $gt: checkInDate, $lte: checkOutDate } },
        { checkIn: { $lte: checkInDate }, checkOut: { $gte: checkOutDate } }
      ]
    });

    const settings = await VillaSettings.findOne();
    const unavailableDates = settings?.unavailableDates || [];

    const dateRange = [];
    const currentDate = new Date(checkInDate);
    while (currentDate < checkOutDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const hasUnavailableDates = dateRange.some(date =>
      unavailableDates.some(ud => ud.toDateString() === date.toDateString())
    );

    const isAvailable = conflictingBookings.length === 0 && !hasUnavailableDates;
    res.json({ available: isAvailable, conflictingBookings: conflictingBookings.length, unavailableDates: hasUnavailableDates });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CALENDAR
app.get('/api/bookings/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await Booking.find({
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkIn: { $gte: startDate, $lte: endDate } },
        { checkOut: { $gte: startDate, $lte: endDate } },
        { checkIn: { $lte: startDate }, checkOut: { $gte: endDate } }
      ]
    }).select('checkIn checkOut status');

    const settings = await VillaSettings.findOne();
    const unavailableDates = settings?.unavailableDates || [];

    const calendar = {};
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = cur.toISOString().split('T')[0];
      calendar[dateStr] = { available: true, booked: false, unavailable: false };

      if (unavailableDates.some(d => d.toDateString() == cur.toDateString())) {
        calendar[dateStr].unavailable = true;
        calendar[dateStr].available = false;
      }

      const isBooked = bookings.some(b => cur >= b.checkIn && cur < b.checkOut);
      if (isBooked) {
        calendar[dateStr].booked = true;
        calendar[dateStr].available = false;
      }
      cur.setDate(cur.getDate() + 1);
    }
    res.json(calendar);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PRICE
app.post('/api/bookings/calculate-price', async (req, res) => {
  try {
    const { checkIn, checkOut, guests } = req.body;
    if (!checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing required fields' });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const settings = await VillaSettings.findOne();
    const pricePerNight = settings?.pricePerNight || 250;
    const cleaningFee = settings?.cleaningFee || 50;
    const taxRate = settings?.taxRate || 0.12;

    const subtotal = nights * pricePerNight;
    const taxes = subtotal * taxRate;
    const total = subtotal + cleaningFee + taxes;

    res.json({ nights, pricePerNight, subtotal, cleaningFee, taxes, total, breakdown: { accommodation: subtotal, cleaning: cleaningFee, taxes, total } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CREATE BOOKING
app.post('/api/bookings', async (req, res) => {
  try {
    const { guestName, email, phone, checkIn, checkOut, guests, specialRequests } = req.body;
    if (!guestName || !email || !phone || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check availability
    const check = await fetch(`${req.protocol}://${req.get('host')}/api/bookings/check-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkIn, checkOut })
    }).then(r => r.json());

    if (!check.available) return res.status(400).json({ error: 'Dates are not available' });

    // Price
    const priceCalc = await fetch(`${req.protocol}://${req.get('host')}/api/bookings/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkIn, checkOut, guests })
    }).then(r => r.json());

    const booking = new Booking({
      guestName, email, phone,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests,
      totalPrice: priceCalc.total,
      specialRequests
    });

    await booking.save();
    res.status(201).json({ message: 'Booking created successfully', booking: {
      id: booking._id,
      guestName: booking.guestName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      totalPrice: booking.totalPrice,
      status: booking.status
    }});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// LIST / GET / UPDATE
app.get('/api/bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = status ? { status } : {};
    const bookings = await Booking.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    const total = await Booking.countDocuments(query);
    res.json({ bookings, totalPages: Math.ceil(total / Number(limit)), currentPage: Number(page), total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GALLERY
app.get('/api/gallery', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category, isActive: true } : { isActive: true };
    const images = await Gallery.find(query).sort({ order: 1, createdAt: -1 });
    res.json(images);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/gallery', async (req, res) => {
  try {
    const image = new Gallery(req.body);
    await image.save();
    res.status(201).json(image);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CONTACT
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, phone } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    console.log('New contact inquiry:', { name, email, message, phone });
    res.json({ message: 'Thank you for your inquiry. We will get back to you soon!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 404
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;