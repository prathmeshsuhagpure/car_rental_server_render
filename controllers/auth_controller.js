const User = require("../models/user_model");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const otps = {};
const bcrypt = require("bcryptjs");
const twilio = require('twilio');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const signupWithEmail = async (req, res) => {
  try {
    const { name, email, password, isHost } = req.body;
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Validate email format
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Determine role
    const role = isHost ? "host" : "user";

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
      authMethod: "email",
      isVerified: false, // You might want to send email verification
    });

    // Generate token
    const token = generateToken(user._id);

    // Return user data (excluding password)
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      isHost: role === "host",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error during signup",
    });
  }
}

const loginWithEmail = async (req, res) => {
  try {
    const { email, password, isHost } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user has a password (phone-only users won't have one)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses phone authentication. Please login with your phone number.",
      });
    }

    // Verify password
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check role if specified
    const requestedRole = isHost ? "host" : "user";
    if (user.role !== requestedRole) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as a ${user.role}, not a ${requestedRole}`,
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user data
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      isHost: user.role === "host",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error during login",
    });
  }
};

const sendOTPWithTwilio = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res
      .status(400)
      .json({ error: true, message: "Phone number is required" });
  }

  const otp = otpGenerator.generate(6, {
    upperCase: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
  });

  const expiresAt = Date.now() + 60000; // 1-minute validity
  otps[phoneNumber] = { otp, expiresAt };

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: `Your Car Rental verification code is: ${otp}. Valid for 1 minute.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`OTP sent to ${phoneNumber}`);
    res.json({success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ success: false, error: true, message: "Failed to send OTP",details: error.message,   // add this
    code: error.code   });
  }
};


// Resend OTP to user's phone number
const resendOTP = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res
      .status(400)
      .json({ error: true, message: "Phone number is required" });
  }

  // Check if OTP was previously sent and hasn't expired
  const existingOtp = otps[phoneNumber];
  if (existingOtp && Date.now() < existingOtp.expiresAt) {
    return res.status(429).json({
      success: false,
      error: true,
      message: "Please wait before requesting a new OTP",
    });
  }

  const otp = otpGenerator.generate(6, {
    upperCase: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
  });

  const expiresAt = Date.now() + 60000; // 1-minute validity
  otps[phoneNumber] = { otp, expiresAt };

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: `Your Car Rental verification code is: ${otp}. Valid for 1 minute.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`Resent OTP for ${phoneNumber}: ${otp}`);
    res.json({ success: true, message: "OTP resent successfully" }); // Added success: true
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ 
      success: false, // Added success: false
      error: true, 
      message: "Failed to resend OTP",
      details: error.message,
      code: error.code 
    });
  }
};


// Verify OTP endpoint and issue token
const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, isHost } = req.body;

    if (!phoneNumber || !otp) {
      return res
        .status(400)
        .json({ error: true, message: "Phone number and OTP are required" });
    }

    const otpData = otps[phoneNumber];
    if (!otpData) {
      return res
        .status(400)
        .json({ error: true, message: "OTP not found for this phone number" });
    }

    const { otp: storedOtp, expiresAt } = otpData;
    if (Date.now() > expiresAt) {
      delete otps[phoneNumber];
      return res.status(400).json({ error: true, message: "OTP has expired" });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ error: true, message: "Invalid OTP" });
    }

    // OTP is valid, remove it
    delete otps[phoneNumber];

    // Find existing user by phone number
    let user = await User.findOne({ phoneNumber });

    if (!user) {
      try {
        // Create user with only phoneNumber (avoid setting email: null)
        user = new User({
          phoneNumber,
          role: isHost ? "host" : "user",
          isHost: isHost || false,
        });
        await user.save();
      } catch (error) {
        return res.status(400).json({
          error: true,
          message: "User already exists with this phone number or email",
        });
      }
    } else {
      // Update existing user's role if they're logging in as host
      if (isHost && user.role !== "host") {
        user.role = "host";
        user.isHost = true;
        await user.save();
      } else if (!isHost && user.role !== "user") {
        user.role = "user";
        user.isHost = false;
        await user.save();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: `OTP verified successfully... Login successful as ${user.role}`,
      token,
      user,
      isHost: user.isHost
    });
  } catch (err) {
    console.error("🔥 Verify OTP error:", err);
    return res.status(500).json({
      error: true,
      message: "Server error",
      details: err.message,
    });
  }
};



// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          drivingLicense: user.drivingLicense,
          role: user.role,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture, 
          driverLicenseUrl: user.driverLicenseUrl,
          aadharCardNumber: user.aadharCardNumber,  
          aadharCardUrl: user.aadharCardUrl,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          driverLicenseNumber: user.driverLicenseNumber,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fixed uploadUserImages function with correct field mapping
const uploadUserImages = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get uploaded files
    const profilePicture = req.files['profilePicture']?.[0];
    const driverLicense = req.files['driverLicense']?.[0];
    const identityProof = req.files['identityProof']?.[0];

    // Check if all required files are uploaded
    if (!profilePicture || !driverLicense || !identityProof) {
      return res.status(400).json({ 
        success: false,
        message: 'All 3 images are required (profilePicture, driverLicense, identityProof)' 
      });
    }

    // Log file paths for debugging
    console.log('Profile Picture Path:', profilePicture.path);
    console.log('Driver License Path:', driverLicense.path);
    console.log('Identity Proof Path:', identityProof.path);

    // Update the user's document in MongoDB with correct field names
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profilePicture: profilePicture.path,
        driverLicenseUrl: driverLicense.path,  // Fixed: was driverLicense
        aadharCardUrl: identityProof.path,     // Fixed: was identityProof
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('Updated User:', updatedUser);

    res.status(200).json({
      success: true,
      message: 'Images uploaded and saved to MongoDB successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        profilePicture: updatedUser.profilePicture,
        driverLicenseUrl: updatedUser.driverLicenseUrl,
        aadharCardUrl: updatedUser.aadharCardUrl,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
      },
    });
  } catch (error) {
    console.error('Error saving images to MongoDB:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error occurred while saving to DB',
      error: error.message 
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate email format if provided
    if (req.body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      // Check if email already exists for another user
      const existingUser = await User.findOne({
        email: req.body.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    // Validate phone number if provided
    if (req.body.phoneNumber) {
      const phoneRegex = /^[+]?[1-9][\d\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(req.body.phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number format",
        });
      }
    }

    // Update allowed fields only if provided
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.phoneNumber) user.phoneNumber = req.body.phoneNumber;
    if (req.body.driverLicenseNumber) user.driverLicenseNumber = req.body.driverLicenseNumber;
    if (req.body.driverLicenseUrl) user.driverLicenseUrl = req.body.driverLicenseUrl;
    if (req.body.aadharCardNumber) user.aadharCardNumber = req.body.aadharCardNumber;
    if (req.body.aadharCardUrl) user.aadharCardUrl = req.body.aadharCardUrl;
    if (req.body.dateOfBirth) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender) user.gender = req.body.gender;
    if (req.body.profilePicture) user.profilePicture = req.body.profilePicture; // Assuming profilePicture is a URL or path

    // Handle password update with proper hashing
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    // Save updated user
    const updatedUser = await user.save();

    // Return response without password
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        drivingLicense: updatedUser.drivingLicense,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        token: generateToken(updatedUser._id),
        profilePicture: updatedUser.profilePicture, // Include profile picture URL
        driverLicenseUrl: updatedUser.driverLicenseUrl,
        aadharCardNumber: updatedUser.aadharCardNumber,
        aadharCardUrl: updatedUser.aadharCardUrl,
        dateOfBirth: updatedUser.dateOfBirth,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error occurred while updating profile",
    });
  }
};

const saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.fcmToken = fcmToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({
      success: false,
      message: "Server error occurred while saving FCM token",
    });
  }
};

const verifyAccount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(200).json({ success: true, message: 'Account already verified' });
    }

    user.isVerified = true;
    await user.save();

    return res.status(200).json({ success: true, message: 'Account verified successfully' });
  } catch (error) {
    console.error('Error verifying account:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
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
};
