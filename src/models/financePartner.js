const mongoose = require("mongoose");

const financePartnerSchema = new mongoose.Schema(
  {
    bank:     { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    logo:     { type: String, default: "" },
    color:    { type: String, default: "#999999" },
    active:   { type: Boolean, default: true },
    defaults: {
      rate:    { type: Number, required: true, min: 0, max: 100 },
      deposit: { type: Number, required: true, min: 0, max: 100 },
      term:    { type: Number, required: true, min: 1 },
      maxRate: { type: Number, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

const FinancePartner = mongoose.model("FinancePartner", financePartnerSchema);

module.exports = FinancePartner;