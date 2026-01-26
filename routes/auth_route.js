const express = require('express');

const {
  saveFcmToken,
  sendOTPWithTwilio,
  verifyOTP,
  getUserProfile,
  updateUserProfile,
  uploadUserImages,
  resendOTP,
  verifyAccount,
  signupWithEmail,
  loginWithEmail,
} = require('../controllers/auth_controller');
const pushNotificationService = require('../services/notification_service');
const { protect } = require('../middlewares/auth_middleware');
const upload = require('../middlewares/upload_middleware'); 

const router = express.Router();

// OTP routes
router.post('/send-otp', sendOTPWithTwilio);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/verify-user-account', protect, verifyAccount);

// Public routes
router.post("/signup", signupWithEmail);
router.post("/login", loginWithEmail);

// FCM token route
router.post('/save-fcm-token', protect, saveFcmToken);
router.post('/send-push-notification', pushNotificationService.sendPushNotification);

// Protected routes
router.get('/get-user-profile', protect, getUserProfile); 
router.put('/update-profile', protect, updateUserProfile);

// Image upload route
router.post(
  '/upload-user-images/:userId',
  protect,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'driverLicense', maxCount: 1 },      
    { name: 'identityProof', maxCount: 1 },     
  ]),
  uploadUserImages
);


module.exports = router;
