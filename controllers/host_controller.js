const Car = require("../models/car_model");
const Booking = require("../models/booking_model");
const mongoose = require("mongoose");

const getHostDashboard = async (req, res) => {
  try {
    const hostId = req.user._id;
    const now = new Date();

    // Upcoming → Active
    await Booking.updateMany(
      {
        bookingStatus: "completed",
        rentalStatus: "upcoming",
        startDate: { $lte: now },
      },
      { $set: { rentalStatus: "active" } }
    );

    // Active → Completed
    await Booking.updateMany(
      {
        rentalStatus: "active",
        endDate: { $lt: now },
      },
      { $set: { rentalStatus: "completed" } }
    );

    const totalCars = await Car.countDocuments({ hostId });

    const activeRentals = await Booking.countDocuments({
      hostId,
      bookingStatus: "completed",
      rentalStatus: "active",
    });

    const monthlyEarnings = await Booking.aggregate([
      {
        $match: {
          hostId,
          bookingStatus: "completed",
          startDate: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const recentBookings = await Booking.find({ hostId })
      .populate("carId", "brand model")
      .sort({ createdAt: -1 })
      .limit(3);

    // Get all cars for this host
    const hostCars = await Car.find({ hostId }).select(
      "_id brand model images"
    );

    // For each car, find its current rental status
    const carsWithRentalInfo = await Promise.all(
      hostCars.map(async (car) => {
        // Find active rental for this car
        const activeBooking = await Booking.findOne({
          carId: car._id,
          bookingStatus: "completed",
          rentalStatus: "active",
        })
          .populate("userId", "name")
          .sort({ startDate: -1 });

        if (activeBooking) {
          return {
            carId: car._id.toString(),
            carName: car.brand,
            carModel: car.model,
            carImage: car.images && car.images.length > 0 ? car.images[0] : null,
            rentalStatus: "active",
            renterName: activeBooking.userId?.name || "Unknown",
            rentalStartDate: activeBooking.startDate.toISOString(),
            rentalEndDate: activeBooking.endDate.toISOString(),
          };
        }

        // Find upcoming rental for this car
        const upcomingBooking = await Booking.findOne({
          carId: car._id,
          bookingStatus: "completed",
          rentalStatus: "upcoming",
        })
          .populate("userId", "name")
          .sort({ startDate: 1 });

        if (upcomingBooking) {
          return {
            carId: car._id.toString(),
            carName: car.brand,
            carModel: car.model,
            carImage: car.images && car.images.length > 0 ? car.images[0] : null,
            rentalStatus: "upcoming",
            renterName: upcomingBooking.userId?.name || "Unknown",
            rentalStartDate: upcomingBooking.startDate.toISOString(),
            rentalEndDate: upcomingBooking.endDate.toISOString(),
          };
        }

        // No active or upcoming rental - car is available or under maintenance
        return {
          carId: car._id.toString(),
          carName: car.brand,
          carModel: car.model,
          carImage: car.images && car.images.length > 0 ? car.images[0] : null,
          rentalStatus: "available",
          renterName: null,
          rentalStartDate: null,
          rentalEndDate: null,
        };
      })
    );

    res.status(200).json({
      totalCars,
      activeRentals,
      monthlyEarnings: monthlyEarnings[0]?.total || 0,
      cars: carsWithRentalInfo,
      recentActivities: recentBookings.map((b) => ({
        title: `${b.carId ? `${b.carId.brand} ${b.carId.model}` : "Unknown Car"} booked`,
        subtitle: `${b.startDate.toDateString()} • ₹${b.amount || 0}`,
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Dashboard error", error: error.message });
  }
};

const getHostCars = async (req, res) => {
  try {
    const hostId = req.user._id;

    if (!hostId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const cars = await Car.find({ hostId })
      .sort({ createdAt: -1 });

    res.status(200).json(cars);
  } catch (error) {
    console.error("Error fetching host cars:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getHostBookings = async (req, res) => {
  try {
    const hostId = req.user._id;

    if (!hostId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await Booking.aggregate([
      {
        $lookup: {
          from: "cars",
          localField: "carId",
          foreignField: "_id",
          as: "car",
        },
      },
      { $unwind: "$car" },

      // ✅ FIXED MATCH
      {
        $match: {
          "car.hostId": new mongoose.Types.ObjectId(hostId),
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      { $sort: { createdAt: -1 } },

      {
        $project: {
          startDate: 1,
          endDate: 1,
          totalPrice: 1,
          status: 1,
          createdAt: 1,
          car: {
            title: "$car.title",
            images: "$car.images",
          },
          user: {
            name: "$user.name",
          },
        },
      },
    ]);

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching host bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getHostDashboard, getHostCars, getHostBookings };