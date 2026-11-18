const mongoose = require("mongoose");

const REQUEST_STATUS = ["Sent", "Received", "Processing", "Completed"];

const statusField = {
  type: String,
  enum: REQUEST_STATUS,
  default: "Sent",
  index: true,
};

const metaFields = {
  source: { type: String, default: "web" },
  ip: { type: String, trim: true },
  userAgent: { type: String, trim: true },
};

const codeField = (prefix) => ({
  type: String,
  unique: true,
  index: true,
  immutable: true,
  default: () => {
    const d = new Date();
    const ymd =
      String(d.getFullYear()).slice(-2) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${ymd}-${rand}`;
  },
});

const PREFIX = {
  PRIVACY: "PC",
  CAR_INQUIRY: "CI",
  FINANCING: "FR",
  TRADE_IN: "TI",
  IMPORT: "IR",
};

const carSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    stockNo: { type: String, trim: true },
    year: { type: Number },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    price: { type: Number, min: 0 },
    priceFormatted: { type: String, trim: true },
    photo: { type: String, trim: true },
  },
  { _id: false }
);

const CATEGORY_MAP = {
  REQUEST: "REQUEST",
  COMMENT: "COMMENT",
  COMPLAINT: "COMPLAINT",
  FEEDBACK: "FEEDBACK",
  FINANCE: "FINANCE",
  SERVICE: "SERVICE",
  OTHER: "OTHER",
  ETC: "ETC",
  ENQUIRY: "REQUEST",
  INQUIRY: "REQUEST",
  GENERAL: "OTHER",
  "GENERAL ENQUIRY": "OTHER",
};

const privacyComplaintSchema = new mongoose.Schema(
  {
    code: codeField(PREFIX.PRIVACY),
    category: {
      type: String,
      enum: [
        "REQUEST",
        "COMMENT",
        "COMPLAINT",
        "FEEDBACK",
        "FINANCE",
        "SERVICE",
        "OTHER",
        "ETC",
      ],
      required: true,
      index: true,
      set: (v) => {
        if (typeof v !== "string") return v;
        const key = v.trim().toUpperCase();
        return CATEGORY_MAP[key] ?? "OTHER";
      },
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },

    categoryLabel: { type: String, trim: true },
    vehicleDetails: { type: String, trim: true },

    requestStatus: statusField,
    adminNote: { type: String, trim: true, maxlength: 2000 },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },

    ...metaFields,
  },
  { timestamps: true }
);

const carInquirySchema = new mongoose.Schema(
  {
    code: codeField(PREFIX.CAR_INQUIRY),
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarRecord",
      required: true,
      index: true,
    },
    carSnapshot: { type: carSnapshotSchema },

    carName: { type: String, required: true, trim: true },
    carPrice: { type: String, trim: true },
    carPriceValue: { type: Number, min: 0 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s-]{9,16}$/, "Invalid phone number"],
    },
    schedule: { type: Boolean, default: false },
    date: { type: String, trim: true },
    time: { type: String, trim: true },
    tradeIn: { type: Boolean, default: false },
    tradeMake: { type: String, trim: true },
    tradeYear: { type: String, trim: true },
    tradeMileage: { type: String, trim: true },

    requestStatus: statusField,
    adminNote: { type: String, trim: true, maxlength: 2000 },

    ...metaFields,
  },
  { timestamps: true }
);

carInquirySchema.index({ createdAt: -1 });
carInquirySchema.index({ carId: 1, requestStatus: 1 });

const calculationSchema = new mongoose.Schema(
  {
    condition: { type: String, trim: true },
    price: { type: Number, min: 0 },
    depositPct: { type: Number, min: 0, max: 100 },
    deposit: { type: Number, min: 0 },
    loan: { type: Number, min: 0 },
    months: { type: Number, min: 0 },
    rate: { type: Number, min: 0 },
    monthly: { type: Number, min: 0 },
    notEligible: { type: Boolean },
  },
  { _id: false }
);

const financingRequestSchema = new mongoose.Schema(
  {
    code: codeField(PREFIX.FINANCING),
    applyType: {
      type: String,
      enum: ["individual", "company"],
      required: true,
      index: true,
      alias: "applicantType",
    },

    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarRecord",
      index: true,
    },
    carLink: { type: String, trim: true },
    carSnapshot: { type: carSnapshotSchema },

    name: { type: String, trim: true },
    idNumber: { type: String, trim: true },
    company: { type: String, trim: true },
    contact: { type: String, trim: true },
    pin: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    employment: { type: String, trim: true },
    vehicle: { type: String, trim: true },
    amount: {
      type: String,
      trim: true,
      set: (v) => (v == null || v === "" ? undefined : String(v)),
    },
    period: { type: String, trim: true },
    calculation: {
      type: calculationSchema,
      alias: "calculator",
    },

    requestStatus: statusField,
    adminNote: { type: String, trim: true, maxlength: 2000 },

    ...metaFields,
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

financingRequestSchema.index({ createdAt: -1 });

const tradeInRequestSchema = new mongoose.Schema(
  {
    code: codeField(PREFIX.TRADE_IN),
    upgradeCarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarRecord",
      index: true,
    },
    upgradeSnapshot: { type: carSnapshotSchema },
    make: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: 2100 },
    mileage: { type: Number, required: true, min: 0 },
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
    photos: [{ type: String }],
    upgrade: { type: String, trim: true },
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
  { timestamps: true }
);

tradeInRequestSchema.index({ createdAt: -1 });

const importRequestSchema = new mongoose.Schema(
  {
    code: codeField(PREFIX.IMPORT),
    origin: {
      type: String,
      enum: ["Japan", "United Kingdom", "UAE", "South Africa"],
      required: true,
      index: true,
    },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: 2100 },
    fuel: {
      type: String,
      enum: ["Petrol", "Diesel", "Hybrid"],
      required: true,
    },
    engine: { type: String, trim: true },

    price: { type: Number, required: true, min: 0 },
    costBreakdown: {
      shipping: { type: Number, min: 0 },
      cif: { type: Number, min: 0 },
      importDuty: { type: Number, min: 0 },
      excise: { type: Number, min: 0 },
      vat: { type: Number, min: 0 },
      idf: { type: Number, min: 0 },
      rdl: { type: Number, min: 0 },
      total: { type: Number, min: 0 },
    },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[\d\s-]{9,16}$/, "Invalid phone number"],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    notes: { type: String, trim: true, maxlength: 2000 },

    requestStatus: statusField,
    adminNote: { type: String, trim: true, maxlength: 2000 },

    ...metaFields,
  },
  { timestamps: true }
);

importRequestSchema.index({ createdAt: -1 });

const PrivacyComplaint = mongoose.model("PrivacyComplaint", privacyComplaintSchema);
const CarInquiry = mongoose.model("CarInquiry", carInquirySchema);
const FinancingRequest = mongoose.model("FinancingRequest", financingRequestSchema);
const TradeInRequest = mongoose.model("TradeInRequest", tradeInRequestSchema);
const ImportRequest = mongoose.model("ImportRequest", importRequestSchema);

module.exports = {
  PrivacyComplaint,
  CarInquiry,
  FinancingRequest,
  TradeInRequest,
  ImportRequest,
  REQUEST_STATUS,
  PREFIX,
};