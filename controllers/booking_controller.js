/* // controllers/bookingController.js - Booking controller

const Booking = require('../models/booking_model');
const Car = require('../models/car_model');
const User = require('../models/user_model');
const sendPushNotification = require('../services/notification_service');
const admin = require('firebase-admin');

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort('-createdAt');

const carIds = bookings.map(b => b.carId);
const cars = await Car.find({ _id: { $in: carIds } });

const bookingsWithCars = bookings.map(booking => ({
  ...booking.toObject(),
  car: cars.find(car => car._id.toString() === booking.carId)
}));

res.status(200).json({
  success: true,
  count: bookings.length,
  data: bookingsWithCars,
});

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('car', 'brand model year color images pricePerDay')
      .populate('user', 'name email phoneNumber');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    // Check if booking belongs to user or user is admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking',
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }
    
    // Check if booking belongs to user or user is admin
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }
    
    // Check if booking can be cancelled (not already completed or cancelled)
    if (booking.bookingStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled as it is already ${booking.bookingStatus}`,
      });
    }
    
    // Update booking status
    booking.bookingStatus = 'cancelled';
    await booking.save();
    
    // Update car availability
    const car = await Car.findById(booking.car);
    car.availability = true;
    await car.save();

    const user = await User.findById(req.user._id);
    if (user && user.fcmToken) {
      const notificationTitle = 'Booking Cancellation';
      const notificationBody = `Your booking for ${booking.carName} has been cancelled.`;
      await sendPushNotification(user.fcmToken, notificationTitle, notificationBody);
    } else {
      console.warn('User FCM token not found or user does not exist');
    }
    
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings/all
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('car', 'brand model year color licensePlate')
      .populate('user', 'name email phoneNumber')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
}; */

const Booking = require('../models/booking_model');
const Car = require('../models/car_model');
const User = require('../models/user_model');
const admin = require('firebase-admin');

const createBooking = async (req, res) => {
  try {
    const {
      carId,
      startDate,
      endDate,
      pickUpLocation,
      dropOffLocation,
      amount,
      paymentId,
    } = req.body;

    // 1️⃣ Validate car
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ 
        success: false, 
        message: 'Car not found', 
      });
    }

    // Check if car is available
    if (!car.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Car is not available for booking',
      });
    }

    // 2️⃣ Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking dates',
      });
    }

    // 3️⃣ Prevent overlapping bookings
    const conflict = await Booking.findOne({
      carId,
      bookingStatus: { $in: ['pending', 'active'] },
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } },
      ],
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'Car already booked for selected dates',
      });
    }

    // 4️⃣ Calculate amount if not sent
    const days =
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

    const finalAmount =
      amount ?? days * (car.pricePerDay || 0);

    // 5️⃣ Create booking
    const booking = await Booking.create({
      userId: req.user._id,
      carId,
      amount: finalAmount,
      pickUpLocation,
      dropOffLocation,
      startDate: start,
      endDate: end,
      paymentId,
      bookingStatus: 'completed',
      paymentStatus: paymentId ? 'completed' : 'pending',
    });

    // Update car availability
    car.isAvailable = false;
    await car.save();

    // Notify host
    const host = await User.findById(car.hostId);
    if (host?.fcmToken) {
      const hostNotification = {
        token: host.fcmToken,
        notification: {
          title: 'New Booking Received',
          body: `Your car ${carId} is booked from ${startDate} to ${endDate}`,
        },
        data: {
          type: 'booking',
          carId: car._id.toString(),
          bookingId: booking._id.toString(),
        },
      };

      try {
        await admin.messaging().send(hostNotification);
      } catch (err) {
        console.error('Failed to send notification to host:', err.message);
      }
    }

    // Notify Customer
    const customer = await User.findById(req.user._id);
    if (customer?.fcmToken) {
      const customerNotification = {
        token: customer.fcmToken,
        notification: {
          title: 'Booking Confirmed',
          body: `You booked ${carId} from ${startDate} to ${endDate}.`,
        },
        data: {
          type: 'booking',
          carId: car._id.toString(),
          bookingId: booking._id.toString(),
        },
      };

      try {
        await admin.messaging().send(customerNotification);
      } catch (err) {
        console.error('Failed to send notification to customer:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      data: booking,
      message: "Booking created successfully",
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('carId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('carId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (booking.bookingStatus !== 'active' && booking.bookingStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled',
      });
    }

    booking.bookingStatus = 'cancelled';
    await booking.save();

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('carId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
};
