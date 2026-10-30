const mongoose = require("mongoose");

const FINANCE_BANKS = ["Stanbic Bank", "KCB", "NCBA", "Absa"];

const financingSchema = new mongoose.Schema(
  {
    /* relationship */
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarRecord",
      required: true,
      index: true,
    },
    /** Denormalised stock number — cheap joins and stable display key. */
    stockNo: { type: String, required: true, index: true },

    /* partner terms */
    bank: {
      type: String,
      enum: FINANCE_BANKS,
      required: true,
    },
    /** Annual interest rate, percent (e.g. 12.5). */
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    /** Deposit as a percentage of price (e.g. 20 = 20%). */
    deposit: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    /** Loan term in months. */
    term: {
      type: Number,
      required: true,
      min: 1,
    },

    /* application tracking */
    pending: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },

    /* audit */
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

/* One financing record per car. */
financingSchema.index({ car: 1 }, { unique: true });
financingSchema.index({ bank: 1, active: 1 });

/* Keep `stockNo` in sync with the referenced car; refuse orphan references. */
financingSchema.pre("save", async function () {
  if (this.isModified("car") || this.isModified("stockNo") || !this.stockNo) {
    const car = await mongoose.model("CarRecord").findById(this.car, "stockNo").lean();
    if (!car) throw new Error("Financing references a car that does not exist");
    this.stockNo = car.stockNo;
  }
});

/* Estimated monthly payment — handy virtual for list views. */
financingSchema.virtual("monthly").get(function () {
  const price = this.populated("car") ? this.car.price : 0;
  if (!price || !this.term || !this.rate) return 0;
  const principal = price * (1 - this.deposit / 100);
  const r = this.rate / 100 / 12;
  const n = this.term;
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
});
financingSchema.set("toJSON", { virtuals: true });
financingSchema.set("toObject", { virtuals: true });

const Financing = mongoose.model("Financing", financingSchema);

module.exports = Financing;
module.exports.FINANCE_BANKS = FINANCE_BANKS;