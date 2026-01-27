/* const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/payment_model');
const connectDB = require('../config/db');

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials are missing');
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

const createRazorpayOrder = async (req, res) => {
  try {
    await connectDB();
    if (!req.user || !req.user._id) {
      return res.status(401).json({
      success: false,
      message: 'User not authenticated'
      });
    }

    const razorpay = getRazorpayInstance();
    const { amount, currency = 'INR' } = req.body;
    const userId = req.user._id;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    };

    const order = await razorpay.orders.create(options);

    // Save payment record with order details
    const payment = await Payment.create({
      userId,
      razorpayOrderId: order.id,
      amount: amount,
      currency: currency,
      status: 'created'
    });

    res.status(201).json({
      success: true,
      orderId: order.id,
      amount: amount,
      currency: currency,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unknown error',
      stack: error.stack
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification details',
      });
    }

    //const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // 3️⃣ CREATE or FIND payment record ✅
    let payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      payment = await Payment.create({
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'captured',
      });
    } else {
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = 'captured';
      await payment.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentDbId: payment._id,
      //razorpayPaymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error('Verify payment crash:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal verification error',
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const payments = await Payment.find({ userId })
      .populate('bookingId')
      .sort({ createdAt: -1 })
      .select('-cardDetails.cvv'); // Don't send CVV

    res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

// @desc    Get Payment by ID
// @route   GET /api/payments/:paymentId
// @access  Private
const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findOne({ _id: paymentId, userId })
      .populate('bookingId')
      .select('-cardDetails.cvv');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
};

// @desc    Refund Payment
// @route   POST /api/payments/refund
// @access  Private
const refundPayment = async (req, res) => {
  try {
    const razorpay = getRazorpayInstance();
    const { paymentId, amount, reason } = req.body;
    const userId = req.user._id;

    // Find payment
    const payment = await Payment.findOne({ _id: paymentId, userId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (!payment.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'No Razorpay payment ID found'
      });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment already refunded'
      });
    }

    // Convert amount to paise
    const refundAmount = Math.round(amount * 100);

    // Create refund
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: refundAmount,
      speed: 'normal',
      notes: {
        reason: reason || 'Booking cancellation'
      }
    });

    // Update payment record
    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundAmount = amount;
    payment.refundReason = reason;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refundId: refund.id
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

module.exports = {
  createPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentHistory,
  getPaymentById,
  refundPayment
}; */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/payment_model');
const connectDB = require('../config/db');

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials are missing');
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const createRazorpayOrder = async (req, res) => {
  try {
    await connectDB();

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const { amount, currency = 'INR' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
      });
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    // ✅ CREATE PAYMENT DOCUMENT (ONLY PLACE)
    const payment = await Payment.create({
      userId: req.user._id,
      razorpayOrderId: order.id,
      amount,
      currency,
      status: 'created',
      paymentMethod: 'card',
    });

    res.status(201).json({
      success: true,
      orderId: order.id,
      paymentId: payment._id,
      amount,
      currency,
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay verification data',
      });
    }

    // 🔐 Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'captured',
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: payment._id,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('bookingId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      userId: req.user._id,
    }).populate('bookingId');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
    });
  }
};

const refundPayment = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    const razorpay = getRazorpayInstance();

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user._id,
    });

    if (!payment || !payment.razorpayPaymentId) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not captured',
      });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment already refunded',
      });
    }

    const refund = await razorpay.payments.refund(
      payment.razorpayPaymentId,
      {
        amount: Math.round(amount * 100),
        notes: { reason },
      }
    );

    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundAmount = amount;
    payment.refundReason = reason;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Refund successful',
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Refund failed',
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentHistory,
  getPaymentById,
  refundPayment,
};
