/* const PaymentMethod = require('../models/payment_model');

const createPayment = async (req, res) => {
  try {
    const { fullName, email, cardNumber, expiryDate, cvv, country, zip, /* method  } = req.body;

    // Validate required fields
    if (!fullName || !email || !cardNumber || !expiryDate || !cvv || !country || !zip /* || !method ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Create new payment method
    const paymentMethod = new PaymentMethod({
      fullName,
      email,
      cardNumber,
      expiryDate,
      cvv,
      country,
      zip,
      //method,
    });

    await paymentMethod.save();

    res.status(201).json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
}

module.exports = {
  createPayment,
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
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

const createPayment = async (req, res) => {
  try {
    const { cardNumber, expiryDate, cvv, fullName, email, country, zip } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!cardNumber || !expiryDate || !cvv || !fullName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required payment details'
      });
    }

    // Mask card number (store only last 4 digits for security)
    const maskedCardNumber = `****-****-****-${cardNumber.slice(-4)}`;

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: 0, // Will be updated when linked to booking
      status: 'created',
      paymentMethod: 'card',
      cardDetails: {
        cardNumber: maskedCardNumber,
        expiryDate,
        fullName,
        email,
        country,
        zip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment information saved successfully',
      data: {
        paymentId: payment._id,
        cardNumber: maskedCardNumber
      }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save payment information',
      error: error.message
    });
  }
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
  console.log('VERIFY BODY:', req.body);
  console.log('ORDER ID:', razorpay_order_id);
  console.log('PAYMENT ID:', razorpay_payment_id);
  console.log('SIGNATURE FROM FLUTTER:', razorpay_signature);

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
      console.log('GENERATED SIGNATURE:', expectedSign);
      console.log(
        'SIGNATURE MATCH:',
          expectedSign === razorpay_signature
);


    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'captured';
    await payment.save();

    res.json({ success: true, message: 'Payment verified' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
};