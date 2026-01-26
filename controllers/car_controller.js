const Car = require('../models/car_model');
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

const updateCar = async (req, res) => {
  try {
    let car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }
    
    car = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
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

// @desc    Delete car
// @route   DELETE /api/cars/:id
// @access  Private/Admin
const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }
    
    await car.remove();
    
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const uploadCarImages = async (req, res) => {
  try {
    const { carId } = req.params;

    // 1. Validate carId
    if (!carId) {
      return res.status(400).json({
        success: false,
        message: 'Car ID is required',
      });
    }

    // 2. Validate files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded',
      });
    }

    // 3. Find car
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }

    // 4. Enforce max 10 images
    if (car.images.length + req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 images allowed per car',
      });
    }

    // 5. Extract Cloudinary URLs
    const imageUrls = req.files.map(file => file.path);

    // 6. Save to MongoDB
    car.images.push(...imageUrls);
    await car.save();

    // 7. Return updated data
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
  updateCar,
  deleteCar,
  uploadCarImages,
};