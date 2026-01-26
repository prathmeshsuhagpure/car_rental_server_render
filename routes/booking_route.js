// routes/bookingRoutes.js - Booking routes

const express = require('express');
const {
  createBooking,
  getUserBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
} = require('../controllers/booking_controller');
const { protect, admin } = require('../middlewares/auth_middleware');

const router = express.Router();

router
  .route('/')
  .post(protect, createBooking)
  .get(protect, getUserBookings);

router.route('/all').get(protect, admin, getAllBookings);

router
  .route('/:id')
  .get(protect, getBooking);

router.route('/:id/cancel').put(protect, cancelBooking);

module.exports = router;