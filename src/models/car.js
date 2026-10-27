const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    stockNo: { type: String, unique: true, index: true },
    status: {
      type: String,
      enum: ["draft", "submitted"],
      required: true,
      default: "draft",
    },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    body: { type: String },
    colour: { type: String },
    mileage: { type: Number, required: true },
    engine: { type: Number, required: true },
    drive: { type: String, required: true },
    transmission: { type: String, required: true },
    fuel: { type: String, required: true },
    vin: { type: String },
    source: { type: String, required: true },
    branch: { type: String, required: true },
    cost: { type: Number, required: true },
    price: { type: Number, required: true },
    negotiable: { type: Boolean, default: false },
    financing: { type: Boolean, default: false },
    notes: { type: String },
    showOnWeb: { type: Boolean, default: false },
    salesperson: { type: String, required: true },
    recommended: { type: Boolean, default: false },
    reviewVideoUrl: { type: String },
    photos: [{ type: String }],
    features: [{ type: String }],
    availabilityStatus: {
      type: String,
      enum: ["inStock", "reserved"],
      default: "inStock",
    },
    banks: [{ type: String }],
    documents: [
      {
        label: { type: String, required: true },
        fileName: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

carSchema.pre("save", async function () {
  if (!this.stockNo) {
    const makeInitial = this.make ? this.make.charAt(0).toUpperCase() : "0";
    const modelInitial = this.model ? this.model.charAt(0).toUpperCase() : "0";
    const engineVal = this.engine !== undefined ? this.engine : "";
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const count = await mongoose.model("CarRecord").countDocuments();
    const sequentialNum = String(count + 1).padStart(3, "0");
    this.stockNo = `${makeInitial}-${modelInitial}-${engineVal}-${month}${year}-${sequentialNum}`;
  }
});

const CarRecord = mongoose.model("CarRecord", carSchema);

module.exports = CarRecord;
