const mongoose = require("mongoose");

const PHOTO_LIMITS = Object.freeze({
  maxBytes: 512 * 1024,
  maxCount: 6,
  allowedMimes: ["image/jpeg", "image/png", "image/webp"],
});

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function normalisePhoto(value) {
  if (typeof value !== "string") {
    throw new Error("Photo must be a base64 image string");
  }

  const v = value.trim();
  const m = DATA_URL_RE.exec(v);
  if (!m) {
    throw new Error("Photo must be a valid base64 data URL (jpeg, png or webp)");
  }

  const mime = m[1].toLowerCase();
  const b64 = m[2];

  if (!PHOTO_LIMITS.allowedMimes.includes(mime)) {
    throw new Error("Photo must be a jpeg, png or webp image");
  }

  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - pad;
  if (bytes > PHOTO_LIMITS.maxBytes) {
    throw new Error(`Photo exceeds ${Math.round(PHOTO_LIMITS.maxBytes / 1024)} KB`);
  }

  return `data:${mime};base64,${b64}`;
}

function normalisePhotos(arr) {
  if (arr == null) return [];
  if (!Array.isArray(arr)) {
    throw new Error("Photos must be an array");
  }
  if (arr.length > PHOTO_LIMITS.maxCount) {
    throw new Error(`At most ${PHOTO_LIMITS.maxCount} photos allowed`);
  }
  return arr.map(normalisePhoto);
}

const TRADE_IN_MAKES = ["Toyota", "Nissan", "Mazda", "Honda", "Subaru"];

const TRADE_IN_UPGRADES = [
  "",
  "Mazda CX-5 2020",
  "Toyota Harrier 2022",
  "Subaru Forester 2021",
];

const tradeInRequestSchema = new mongoose.Schema(
  {
    code: codeField(PREFIX.TRADE_IN),
    upgradeCarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarRecord",
      index: true,
    },
    upgradeSnapshot: { type: carSnapshotSchema },
    make: {
      type: String,
      required: true,
      trim: true,
      index: true,
      enum: TRADE_IN_MAKES,
    },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: 2100 },
    mileage: { type: Number, required: true, min: 0, max: 1000000 },
    transmission: {
      type: String,
      enum: ["Automatic", "Manual", "CVT"],
      required: true,
    },
    fuel: {
      type: String,
      enum: ["Petrol", "Diesel", "Hybrid", "EV"],
      required: true,
    },
    condition: {
      type: String,
      enum: ["Excellent", "Good", "Fair", "Needs work"],
      required: true,
    },

    photos: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (arr) => {
            try {
              normalisePhotos(arr);
              return true;
            } catch {
              return false;
            }
          },
          message: "One or more photos are invalid or too large",
        },
      ],
    },

    upgrade: {
      type: String,
      trim: true,
      enum: TRADE_IN_UPGRADES,
    },
    upgradePrice: { type: Number, min: 0 },

    dayIndex: { type: Number, min: 0, max: 6, default: 1 },
    time: { type: String, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s-]{9,16}$/, "Invalid phone number"],
    },

    requestStatus: statusField,
    adminNote: { type: String, trim: true, maxlength: 2000 },

    ...metaFields,
  },
  { timestamps: true, strict: "throw" }
);

tradeInRequestSchema.pre("validate", function (next) {
  if (Array.isArray(this.photos) && this.photos.length) {
    try {
      this.photos = normalisePhotos(this.photos);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

tradeInRequestSchema.index({ createdAt: -1 });

const TradeInRequest = mongoose.model("TradeInRequest", tradeInRequestSchema);

module.exports = {
  PrivacyComplaint,
  CarInquiry,
  FinancingRequest,
  TradeInRequest,
  ImportRequest,
  REQUEST_STATUS,
  PREFIX,
  normalisePhoto,
  normalisePhotos,
  PHOTO_LIMITS,
};