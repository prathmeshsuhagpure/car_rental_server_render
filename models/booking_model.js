const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: true,
      index: true,
    },

    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    pickUpLocation: {
      type: String,
      required: true,
      trim: true,
    },

    dropOffLocation: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    bookingStatus: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },

    rentalStatus: {
      type: String,
      enum: ["upcoming", "active", "completed"],
      default: "upcoming",
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    }
  },
  {
    timestamps: true, // gives createdAt & updatedAt
  }
);

bookingSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ carId: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ hostId: 1, rentalStatus: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });


const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;