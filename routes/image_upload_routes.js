const express = require("express");
const mongoose = require("mongoose");
const upload = require("../config/gridFs_storage");

const router = express.Router();

let gfs;
mongoose.connection.once("open", () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "carImages",
    });
});

router.post(
    "/upload/carImages",
    upload.array("images", 10),
    (req, res) => {
        if (!req.files || req.files.length < 10) {
            return res.status(400).json({
                error: "Minimum 10 images are required",
            });
        }

        const images = req.files.map(file => ({
            imageId: file.id,
            imageUrl: `${process.env.BASE_URL}/api/images/${file.id}`,
        }));

        res.status(201).json({
            hostId: req.body.hostId,
            images,
        });
    }
);


router.get("/:id", async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        gfs.openDownloadStream(fileId).pipe(res);
    } catch (err) {
        res.status(404).json({ error: "Image not found" });
    }
});

module.exports = router;
