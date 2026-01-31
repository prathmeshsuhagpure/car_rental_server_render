const Booking = require('../models/booking_model');
const Car = require('../models/car_model');
const User = require('../models/user_model');
const Payment = require('../models/payment_model')
const admin = require('firebase-admin');
const { v4: uuidv4 } = require("uuid");

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

    // Validate car
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

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking dates',
      });
    }

    // Prevent overlapping bookings
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

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    const finalAmount = amount ?? days * (car.pricePerDay || 0);

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required',
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user._id,
      status: 'captured',
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Valid payment not found',
      });
    }

    // 5️⃣ Create booking
    const booking = await Booking.create({
      bookingId: uuidv4(),
      userId: req.user._id,
      hostId: car.hostId,
      carId,
      amount: finalAmount,
      pickUpLocation,
      dropOffLocation,
      startDate: start,
      endDate: end,
      paymentId: payment._id,
      bookingStatus: 'completed',
      paymentStatus: 'completed',
      rentalStatus: "upcoming"
    });

    // UPDATE existing payment with bookingId
    await Payment.findByIdAndUpdate(payment._id, {
      bookingId: booking._id,
    });

    // Update car availability
    car.isAvailable = false;
    await car.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'carId',
        select:
          'brand model images transmission fuelType seats pricePerDay',
      })
      .populate({
        path: 'userId',
        select: 'name email phone',
      });
    console.log(
      'BOOKING RESPONSE:',
      JSON.stringify(populatedBooking, null, 2)
    );

    // Notify host
    const host = await User.findById(car.hostId);
    if (host?.fcmToken) {
      const hostNotification = {
        token: host.fcmToken,
        notification: {
          title: 'New Booking Received',
          body: `Your car ${car.brand + car.model} is booked from ${startDate} to ${endDate}`,
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
          body: `You booked ${car.brand + car.model} from ${startDate} to ${endDate}.`,
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
      data: populatedBooking,
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
      return res
        .status(404)
        .json({ success: false, message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'Unauthorized' });
    }

    if (!['active', 'pending', 'completed'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled',
      });
    }

    booking.bookingStatus = 'cancelled';

    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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