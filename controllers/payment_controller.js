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
