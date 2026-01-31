const Car = require('../models/car_model');
const booking = require('../models/booking_model');
const upload = require('../middlewares/upload_middleware');

const getCars = async (req, res) => {
  try {
    const query = {};

    if (req.query.availability) {
      query.availability = req.query.availability === 'true';
    }

    if (req.query.brand) {
      query.brand = { $regex: req.query.brand, $options: 'i' };
    }
    
    if (req.query.minPrice && req.query.maxPrice) {
      query.pricePerDay = {
        $gte: parseFloat(req.query.minPrice),
        $lte: parseFloat(req.query.maxPrice),
      };
    } else if (req.query.minPrice) {
      query.pricePerDay = { $gte: parseFloat(req.query.minPrice) };
    } else if (req.query.maxPrice) {
      query.pricePerDay = { $lte: parseFloat(req.query.maxPrice) };
    }
 
    const cars = await Car.find(query);
    
    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: car,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createCar = async (req, res) => {
  try {
    const car = await Car.create(req.body);
    
    res.status(201).json({
      success: true,
      data: car,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateCarAvailability = async (req, res) => {
  try {
    const { carId } = req.params;
    const { isAvailable } = req.body;
    const userId = req.user.id; 

    const car = await Car.findById(carId);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    if (car.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this car'
      });
    }

    if (!isAvailable) {
      const upcomingBookings = await Booking.find({
        car: carId,
        rentalStatus: { $in: ['active', 'upcoming'] },
        startDate: { $gte: new Date() }
      });

      if (upcomingBookings.length > 0) {
        // You can either prevent it or just warn
        // For warning (still allow the update):
        car.isAvailable = isAvailable;
        await car.save();

        return res.status(200).json({
          success: true,
          message: 'Car availability updated successfully',
          warning: `This car has ${upcomingBookings.length} upcoming booking(s)`,
          data: car
        });
      }
    }

    // Update the availability
    car.isAvailable = isAvailable;
    await car.save();

    res.status(200).json({
      success: true,
      message: `Car marked as ${isAvailable ? 'available' : 'unavailable'} successfully`,
      data: car
    });

  } catch (error) {
    console.error('Error updating car availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update car availability',
      error: error.message
    });
  }
};

const deleteCar = async (req, res) => {
  try {
    const { carId } = req.params;
    const userId = req.user.id; 

    const car = await Car.findById(carId);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    if (car.host.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this car'
      });
    }

    const activeBookings = await Booking.find({
      car: carId,
      rentalStatus: { $in: ['active', 'upcoming'] },
      endDate: { $gte: new Date() }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete car with active bookings. Please cancel or complete all bookings first.',
        activeBookingsCount: activeBookings.length
      });
    }

    // Delete the car
    await Car.findByIdAndDelete(carId);

    // Optional: You might want to also update or delete related bookings
    // await Booking.updateMany(
    //   { car: carId },
    //   { $set: { bookingStatus: 'cancelled' } }
    // );

    res.status(200).json({
      success: true,
      message: 'Car deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete car',
      error: error.message
    });
  }
};

const uploadCarImages = async (req, res) => {
  try {
    const { carId } = req.params;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: 'Car ID is required',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded',
      });
    }

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }

    if (car.images.length + req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 images allowed per car',
      });
    }

    const imageUrls = req.files.map(file => file.path);

    car.images.push(...imageUrls);
    await car.save();

    res.status(200).json({
      success: true,
      images: imageUrls,
      totalImages: car.images.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: err.message,
    });
  }
};



module.exports = {
  getCars,
  getCar,
  createCar,
  updateCarAvailability,
  deleteCar,
  uploadCarImages,
};