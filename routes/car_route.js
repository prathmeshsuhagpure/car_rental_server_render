const express = require('express');
//const upload = require('../middlewares/upload_middleware');


const { getCars, getCar, createCar, updateCar, deleteCar, /* uploadCarImages */ } = require('../controllers/car_controller');
const { protect, admin } = require('../middlewares/auth_middleware');

const router = express.Router();

router
  .route('/')
  .get(getCars)
  .post(protect, admin, createCar);

router
  .route('/:id')
  .get(getCar)
  .put(protect, admin, updateCar)
  .delete(protect, admin, deleteCar);

module.exports = router;