const Car = require('../models/car_model');
const Review = require('../models/review_model');

const addReview = async (req, res) => {
  try {
    const { carId, rating, comment, userId } = req.body;
    const userName = req.user.name;

    if (!carId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const existingReview = await Review.findOne({ carId, userId });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this car',
      });
    }

    // 1️⃣ Save review
    const review = await Review.create({
      carId,
      userId,
      rating,
      comment,
      userName,
    });

    // 2️⃣ Fetch car
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // 3️⃣ Calculate new rating
    const totalRating = (car.rating * car.reviews) + rating;
    const newReviewsCount = car.reviews + 1;
    const newRating = totalRating / newReviewsCount;

    car.rating = Number(newRating.toFixed(1));
    car.reviews = newReviewsCount;

    await car.save();

    res.status(201).json({
      message: 'Review added successfully',
      rating: car.rating,
      reviews: car.reviews,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewsByCar = async (req, res) => {
  try {
    const { carId } = req.params;

    const reviews = await Review.find({ carId })
      .sort({ createdAt: -1 })
      .select('_id userName rating comment');

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error('Get Reviews Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = { addReview, getReviewsByCar };
