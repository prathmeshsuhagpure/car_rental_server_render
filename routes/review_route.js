const express = require('express');
const router = express.Router();
const { addReview, getReviewsByCar, } = require('../controllers/review_controller');

router.post('/review', addReview);

router.get('/reviews/:carId', getReviewsByCar);

module.exports = router;
