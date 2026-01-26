/* const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },

    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    brand: {
      type: String,
      required: true,
    },

    model: {
      type: String,
      required: true,
    },

    year: {
      type: Number,
      default: 2020,
    },

    color: {
      type: String,
      default: "Unknown",
    },

    licensePlate: {
      type: String,
      required: true,
      unique: true,
    },

    seats: {
      type: Number,
      default: 5,
    },

    transmission: {
      type: String,
      enum: ["Automatic", "Manual"],
      required: true,
    },

    fuelType: {
      type: String,
      enum: ["Diesel", "Petrol", "Electric", "Hybrid", "CNG"],
      required: true,
    },

    category: {
      type: String,
      enum: ["SUV", "Sedan", "Hatchback", "Pickup", "Sports", "MPV"],
      required: true,
    },

    features: {
      type: [String],
      default: [],
    },

    images: {
      type: [String],
      default: [],
    },

    location: {
      type: String,
      default: "Unknown location",
    },

    instantBooking: {
      type: Boolean,
      default: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    originalPrice: {
      type: Number,
      required: true,
    },

    average: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      default: 0,
    },

    distance: {
      type: String,
      default: "",
    },

    hostedBy: {
      type: String,
      default: "Company itself",
    },

    reviews: {
      type: Number,
      default: 0,
    },

    hasActiveFastTag: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

carSchema.virtual("offerPrice").get(function () {
  return this.originalPrice * 0.8;
});

const Car = mongoose.model("Car", carSchema);
module.exports = Car; */

const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    brand: {
      type: String,
      required: true,
    },

    model: {
      type: String,
      required: true,
    },

    year: {
      type: Number,
      default: 2020,
    },

    color: {
      type: String,
      default: "Unknown",
    },

    licensePlate: {
      type: String,
      required: true,
      unique: true,
    },

    seats: {
      type: Number,
      default: 5,
    },

    transmission: {
      type: String,
      enum: ["Automatic", "Manual"],
      required: true,
    },

    fuelType: {
      type: String,
      enum: ["Diesel", "Petrol", "Electric", "Hybrid", "CNG"],
      required: true,
    },

    category: {
      type: String,
      enum: ["SUV", "Sedan", "Hatchback", "Pickup", "Sports", "MPV"],
      required: true,
    },

    features: {
      type: [String],
      default: [],
    },

    images: {
      type: [String],
      default: [],
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
    },

    instantBooking: {
      type: Boolean,
      default: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    originalPrice: {
      type: Number,
      required: true,
    },

    average: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      default: 0,
    },

    hostedBy: {
      type: String,
      default: "Company itself",
    },

    reviews: {
      type: Number,
      default: 0,
    },

    hasActiveFastTag: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

carSchema.index({ location: "2dsphere" });

carSchema.virtual("offerPrice").get(function () {
  return this.originalPrice * 0.8;
});

const Car = mongoose.model("Car", carSchema);
module.exports = Car;
