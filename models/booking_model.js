/* const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    carId: {
      type: mongoose.Schema.Types.ObjectId, 
      required: [true, 'Please provide the car ID'],
      ref: 'Car', // Added reference to Car model
    },
    carName: {
      type: String,
      required: [true, 'Please provide the car name'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide the booking amount'],
      min: [0, 'Amount cannot be negative'], // Added validation
    },
    pickupLocation: {
      type: String,
      required: [true, 'Please provide a pickup location'],
      trim: true,
    },
    dropoffLocation: {
      type: String,
      required: [true, 'Please provide a drop-off location'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date'],
      validate: {
        validator: function(value) {
          return value >= new Date().setHours(0, 0, 0, 0); // Start date should not be in the past
        },
        message: 'Start date cannot be in the past'
      }
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date'],
      validate: {
        validator: function(value) {
          return value > this.startDate; // End date should be after start date
        },
        message: 'End date must be after start date'
      }
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      default: 1,
    },
    trips: {
      type: Number,
      default: 0,
      min: [0, 'Trips cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'completed', 'failed'],
        message: 'Payment status must be pending, completed, or failed'
      },
      default: 'pending',
    },
    bookingStatus: {
      type: String,
      enum: {
        values: ['active', 'completed', 'cancelled', 'pending'],
        message: 'Booking status must be active, completed, cancelled, or pending'
      },
      default: 'pending', // Changed from 'active' to 'pending' - more logical default
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be active or inactive'
      },
      default: 'active',
    },
    bookingDate: {
      type: Date,
      default: Date.now, // Changed to use Date.now as default
      required: true,
    },
    bookingId: {
      type: String,
      default: function() { // Changed arrow function to regular function for 'this' context
        return `BK${Date.now()}`;
      },
      unique: true,
      index: true, // Added index for faster queries
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    }, 
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals when converting to JSON
    toObject: { virtuals: true } // Include virtuals when converting to Object
  }
);

// Improved virtual for booking duration in days
bookingSchema.virtual('durationDays').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = end.getTime() - start.getTime(); // No need for Math.abs if validation ensures end > start
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays); // Minimum 1 day booking
});

// Virtual for total cost calculation (if you have daily rates)
bookingSchema.virtual('totalCost').get(function () {
  return this.amount; // Or calculate based on duration and daily rate
});

// Pre-save middleware to ensure data consistency
bookingSchema.pre('save', function(next) {
  // Ensure end date is after start date
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Set booking date if not provided
  if (!this.bookingDate) {
    this.bookingDate = new Date();
  }
  
  next();
});

// Index for faster queries
bookingSchema.index({ userId: 1, bookingDate: -1 });
bookingSchema.index({ carId: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ bookingStatus: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking; */

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

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
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
//bookingSchema.index({ bookingStatus: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;