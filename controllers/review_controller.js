const Car = require('../models/car_model');
const Review = require('../models/review_model');

const addReview = async (req, res) => {
  try {
    const { carId, userId, rating, comment } = req.body;

    // ✅ Basic validation
    if (!carId || !userId || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 1️⃣ Save review
    await Review.create({
      carId,
      userId,
      rating,
      comment,
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
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addReview, getReviewsByCar };
