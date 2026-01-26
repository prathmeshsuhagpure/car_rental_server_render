/* const express = require('express');
const {createPayment} = require('../controllers/payment_controller');
const { protect } = require('../middlewares/auth_middleware');

const router = express.Router();

router.post('/createPayment', protect, createPayment);

module.exports = router; */

const express = require('express');
const router = express.Router();
const {
  createPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentHistory,
  getPaymentById,
  refundPayment
} = require('../controllers/payment_controller');
const { protect } = require('../middlewares/auth_middleware');

// All routes require authentication
router.use(protect);

// Card payment (save payment info)
router.post('/create', createPayment);

// Razorpay routes
router.post('/razorpay/create-order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

// Payment history and details
router.get('/history', getPaymentHistory);
router.get('/:paymentId', getPaymentById);

// Refund
router.post('/refund', refundPayment);

module.exports = router;