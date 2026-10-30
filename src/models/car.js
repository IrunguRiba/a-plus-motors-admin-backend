const mongoose = require("mongoose");
const { FINANCE_BANKS: CATALOGUE_BANKS, partnerFor } = require("../../helpers/finance-partners");
const { computeTerms } = require("../../helpers/finance-rules");

/* ---------- embedded financing subdocument ---------- */
const financingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },

    /* banks this car can be financed through */
    banks: { type: [String], default: [] },

    /* primary bank — its terms populate the computed fields below */
    primaryBank: { type: String },

    /* denormalised display metadata for every bank on the car */
    bankDetails: [
      {
        _id: false,
        bank: { type: String },
        fullName: { type: String },
        logo: { type: String },
        color: { type: String },
      },
    ],

    /* primary-bank display metadata */
    bankFullName: { type: String },
    bankLogo: { type: String },
    bankColor: { type: String },

    /* computed terms */
    rate:      { type: Number, min: 0, max: 100 },
    deposit:   { type: Number, min: 0, max: 100 },
    term:      { type: Number, min: 1 },
    maxAmount: { type: Number, min: 0 },
    monthly:   { type: Number, min: 0 },

    /* per-car overrides — win over computed defaults when set */
    overrides: {
      rate:    { type: Number, min: 0, max: 100 },
      deposit: { type: Number, min: 0, max: 100 },
      term:    { type: Number, min: 1 },
    },

    /* application tracking */
    pending: { type: Number, default: 0, min: 0 },
    active:  { type: Boolean, default: true },

    updatedBy: { type: String },
  },
  { _id: false }
);

const carSchema = new mongoose.Schema(
  {
    stockNo: { type: String, unique: true, index: true },
    status: { type: String, enum: ["draft", "submitted"], required: true, default: "draft" },

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
    cost: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
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

    banks: { type: [String], default: [] },

    documents: [
      {
        label: { type: String, required: true },
        fileName: { type: String, required: true },
      },
    ],

    finance: { type: financingSchema, default: () => ({}) },
  },
  { timestamps: true }
);

/* ---------- indexes ---------- */
carSchema.index({ "finance.banks": 1 });
carSchema.index({ "finance.primaryBank": 1, "finance.active": 1 });

/* ---------- stock number generation ---------- */
carSchema.pre("save", async function () {
  if (this.stockNo) return;

  const makeInitial = this.make ? this.make.charAt(0).toUpperCase() : "0";
  const modelInitial = this.model ? this.model.charAt(0).toUpperCase() : "0";
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  const count = await mongoose.model("CarRecord").countDocuments();
  const seq = String(count + 1).padStart(3, "0");

  this.stockNo = `${makeInitial}${modelInitial}${month}${year}-${seq}`;
});

/* ---------- recompute finance on every save ---------- */
carSchema.pre("save", async function () {
  const f = this.finance;
  if (!f) return;

  this.financing = !!f.enabled;
  if (!Array.isArray(f.banks)) f.banks = [];

  const FinancePartner = mongoose.models.FinancePartner;

  const resolveMeta = async (bank) => {
    let partner = null;
    if (FinancePartner) {
      partner = await FinancePartner.findOne({ bank, active: true }).lean();
    }
    if (!partner) {
      const stat = partnerFor(bank);
      if (!stat) return null;
      partner = {
        bank: stat.bank,
        fullName: stat.fullName,
        logo: stat.logo,
        color: stat.color,
        defaults: stat.defaults,
        active: true,
      };
    }
    return partner;
  };

  /* drop unknown/inactive banks from the list */
  const resolved = [];
  for (const bank of f.banks) {
    const meta = await resolveMeta(bank);
    if (meta) resolved.push(meta);
  }
  f.banks = resolved.map((m) => m.bank);
  f.bankDetails = resolved.map((m) => ({
    bank: m.bank,
    fullName: m.fullName,
    logo: m.logo,
    color: m.color,
  }));

  /* legacy top-level sync */
  this.banks = [...f.banks];

  /* primary bank must be in the list */
  if (f.primaryBank && !f.banks.includes(f.primaryBank)) {
    f.primaryBank = f.banks[0] || undefined;
  }

  if (!f.enabled || !f.primaryBank) return;

  const primary = await resolveMeta(f.primaryBank);
  if (!primary) {
    f.enabled = false;
    this.financing = false;
    return;
  }

  f.bankFullName = primary.fullName;
  f.bankLogo = primary.logo;
  f.bankColor = primary.color;

  try {
    const terms = computeTerms(
      {
        price: this.price,
        cost: this.cost,
        year: this.year,
        mileage: this.mileage,
        body: this.body,
        fuel: this.fuel,
      },
      f.primaryBank,
      { defaults: primary.defaults, overrides: f.overrides, meta: primary }
    );
    f.rate = terms.rate;
    f.deposit = terms.deposit;
    f.term = terms.term;
    f.maxAmount = terms.maxAmount;
    f.monthly = terms.monthly;
  } catch {
    f.enabled = false;
    this.financing = false;
  }
});

const CarRecord = mongoose.model("CarRecord", carSchema);

module.exports = CarRecord;
module.exports.FINANCE_BANKS = CATALOGUE_BANKS;