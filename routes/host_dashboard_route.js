const express = require("express");
const router = express.Router();

const {getHostDashboard} = require("../controllers/host_dashboard_controller");
const {protect, admin} = require("../middlewares/auth_middleware");

router.get("/host/dashboard", protect, admin, getHostDashboard);

module.exports = router;
