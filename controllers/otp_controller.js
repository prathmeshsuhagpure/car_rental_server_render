const cron = require('node-cron');
const User = require('../models/user_model');

// Clean up expired OTPs every 10 minutes
const setupCleanupJob = () => {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const result = await User.clearExpiredOTPs();
      console.log(`Cleaned up expired OTPs: ${result.modifiedCount} users updated`);
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  });
  
  console.log('OTP cleanup job scheduled to run every 10 minutes');
};

module.exports = setupCleanupJob;