const express = require("express");
const router = express.Router();

const {getHostDashboard, getHostCars, getHostBookings} = require("../controllers/host_controller");
const {protect, admin} = require("../middlewares/auth_middleware");

router.get("/dashboard", protect, admin, getHostDashboard);
router.get("/cars", protect, admin, getHostCars);
router.get('/bookings', protect, admin, getHostBookings);

module.exports = router;
