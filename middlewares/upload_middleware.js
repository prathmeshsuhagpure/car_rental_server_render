const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../middlewares/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'car_images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1200, quality: 'auto' }],
  },
});

const upload = multer({ storage });

module.exports = upload;