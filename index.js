require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth_route');
const carRoutes = require('./routes/car_route');
const bookingRoutes = require('./routes/booking_route');
const paymentRoutes = require('./routes/payment_route');
const reviewRoutes = require('./routes/review_route');
const hostRoutes = require('./routes/host_route')

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/', reviewRoutes);
app.use('/api/host', hostRoutes);

// Start server const 
PORT = process.env.PORT; 
app.listen(PORT, () => { 
  console.log(`Server running on http://localhost:${PORT}`); 
});

module.exports = app;