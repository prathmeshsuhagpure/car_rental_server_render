const Car = require("../models/car_model");
const Booking = require("../models/booking_model");
const Review = require("../models/review_model");

const getHostDashboard = async (req, res) => {
  try {
    const hostId = req.user._id; 

    const totalCars = await Car.countDocuments({ hostId });

    const activeRentals = await Booking.countDocuments({
      hostId,
      bookingStatus: "active",
    });

    const monthlyEarnings = await Booking.aggregate([
      {
        $match: {
          hostId,
          bookingStatus: "completed",
          startDate: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const ratingData = await Review.aggregate([
      { $match: { hostId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    const recentBookings = await Booking.find({ hostId })
      .sort({ createdAt: -1 })
      .limit(3);

    res.status(200).json({
      totalCars,
      activeRentals,
      monthlyEarnings: monthlyEarnings[0]?.total || 0,
      rating: ratingData[0]?.avgRating || 0,
      recentActivities: recentBookings.map((b) => ({
        title: `${b.carName} booked`,
        subtitle: `${b.startDate.toDateString()} • ₹${b.totalAmount}`,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Dashboard error", error });
  }
};

module.exports = {getHostDashboard};
