const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentHistory,
  getPaymentById,
  refundPayment
} = require('../controllers/payment_controller');
const { protect } = require('../middlewares/auth_middleware');

// All routes require authentication
router.use(protect);

// Razorpay routes
router.post('/razorpay/create-order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

// Payment history and details
router.get('/history', getPaymentHistory);
router.get('/:paymentId', getPaymentById);

// Refund
router.post('/refund', refundPayment);

module.exports = router;