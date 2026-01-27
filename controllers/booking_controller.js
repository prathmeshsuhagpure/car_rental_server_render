const Booking = require('../models/booking_model');
const Car = require('../models/car_model');
const User = require('../models/user_model');
const Payment = require('../models/payment_model')
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
      paymentMethod,
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
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

    const finalAmount = amount ?? days * (car.pricePerDay || 0);


    const payment = await Payment.create({
      userId: req.user._id,
      amount: finalAmount,
      method: paymentMethod || 'unknown',
      paymentStatus: 'completed', // or 'pending' if you want to handle async payment
    });

    // 5️⃣ Create booking
    const booking = await Booking.create({
      userId: req.user._id,
      carId,
      amount: finalAmount,
      pickUpLocation,
      dropOffLocation,
      startDate: start,
      endDate: end,
      paymentId: payment._id,
      bookingStatus: 'completed',
      paymentStatus: 'completed',
    });

    await Payment.findByIdAndUpdate(paymentId, {
      bookingId: booking._id,
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
