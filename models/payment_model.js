/* const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  cardNumber: String,
  expiryDate: String,
  cvv: String,
  country: String,
  zip: String,
  //method: String, // 'card', 'apple_pay', 'google_pay'
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', PaymentMethodSchema);
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  razorpayOrderId: {
    type: String,
    default: null,
    unique: true, 
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
    default: 'created'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet'],
    default: 'card'
  },
  cardDetails: {
    cardNumber: String,
    expiryDate: String,
    fullName: String,
    email: String,
    country: String,
    zip: String
  },
  refundId: {
    type: String,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);