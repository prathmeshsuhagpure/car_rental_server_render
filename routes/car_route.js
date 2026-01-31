const express = require('express');
//const upload = require('../middlewares/upload_middleware');


const { getCars, getCar, createCar, updateCarAvailability, deleteCar, /* uploadCarImages */ } = require('../controllers/car_controller');
const { protect, admin } = require('../middlewares/auth_middleware');

const router = express.Router();

router
  .route('/')
  .get(getCars)
  .post(protect, admin, createCar);

router
  .route('/:id')
  .get(getCar)
  .delete(protect, admin, deleteCar);

router
.patch('/:id/availability', protect, admin, updateCarAvailability);

module.exports = router;