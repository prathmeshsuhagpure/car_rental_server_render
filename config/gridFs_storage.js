const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    const hostId = req.body.hostId;

    if (!hostId) {
      throw new Error("hostId is required");
    }

    return {
      filename: `car-${Date.now()}-${file.originalname}`,
      bucketName: "carImages",
      metadata: {
        hostId,
        uploadedAt: new Date(),
      },
    };
  },
});

module.exports = multer({
  storage,
  limits: { files: 10 }, 
});
