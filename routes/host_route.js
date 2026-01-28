const express = require("express");
const router = express.Router();

const {getHostDashboard, getHostCars, getHostBookings, getHostEarnings} = require("../controllers/host_controller");
const {protect, admin} = require("../middlewares/auth_middleware");

router.get("/dashboard", protect, admin, getHostDashboard);
router.get("/cars", protect, admin, getHostCars);
router.get('/bookings', protect, admin, getHostBookings);
router.get('/hostEarnings', protect, admin, getHostEarnings);

module.exports = router;
