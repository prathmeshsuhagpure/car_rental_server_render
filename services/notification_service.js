const admin = require("firebase-admin");

if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not set. Check your .env file.");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Send a push notification to a specific device via FCM token.
 * @param {string} fcmToken - The FCM device token.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 */

const sendPushNotification = async (fcmToken, title, body) => {
  if (!fcmToken || typeof fcmToken !== 'string') {
    console.error("Invalid or missing FCM token. Push notification not sent.");
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Push notification sent:", response);
  } catch (error) {
    console.error("Error sending push notification:", error);

    if (error.code === 'messaging/registration-token-not-registered') {
    // Remove the invalid token from your database
    await deleteTokenFromDatabase(hostUserId); // implement this
  }
  }
};

module.exports = {
  sendPushNotification,
  admin
};
