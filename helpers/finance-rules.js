const {
    FINANCE_BANKS,
    PARTNER_BY_BANK,
  } = require("./finance-partners");
  
  const BOUNDS = {
    rate:    { min: 8,  max: 24 },
    deposit: { min: 10, max: 50 },
    term:    { min: 12, max: 84 },
  };
  
  const clamp = (n, { min, max }) => Math.min(max, Math.max(min, n));
  const roundTo = (n, step) => Math.round(n / step) * step;
  
  /* ---------- per-car adjustments ---------- */
  function agePenalty(year) {
    const age = Math.max(0, new Date().getFullYear() - Number(year || 0));
    if (age <= 2) return 0;
    if (age <= 5) return 0.5;
    if (age <= 8) return 1.0;
    if (age <= 12) return 1.5;
    return 2.5;
  }
  
  function mileagePenalty(mileage) {
    const km = Number(mileage || 0);
    if (km <= 30_000) return 0;
    if (km <= 80_000) return 0.25;
    if (km <= 150_000) return 0.5;
    return 1.0;
  }
  
  function priceTierDeposit(price) {
    const p = Number(price || 0);
    if (p >= 8_000_000) return 10;
    if (p >= 5_000_000) return 7;
    if (p >= 3_000_000) return 5;
    if (p >= 1_500_000) return 2;
    return 0;
  }
  
  function bodyAdjustment(body) {
    const b = String(body || "").toLowerCase();
    if (b.includes("pickup") || b.includes("pick up")) return { deposit: 5, term: -12 };
    if (b.includes("coupe") || b.includes("convertible")) return { deposit: 5, term: -12 };
    if (b.includes("suv")) return { deposit: 2, term: 0 };
    if (b.includes("sedan") || b.includes("saloon")) return { deposit: 0, term: 6 };
    if (b.includes("hatchback")) return { deposit: 0, term: 0 };
    return { deposit: 0, term: 0 };
  }
  
  function fuelAdjustment(fuel) {
    const f = String(fuel || "").toLowerCase();
    if (f.includes("electric") || f === "ev") return { rate: -0.5, term: -12 };
    if (f.includes("hybrid")) return { rate: -0.25, term: -6 };
    if (f.includes("diesel")) return { rate: 0.25, term: 0 };
    return { rate: 0, term: 0 };
  }
  
  function marginAdjustment(cost, price) {
    const p = Number(price || 0);
    const c = Number(cost || 0);
    if (!p || !c) return 0;
    const marginPct = ((p - c) / p) * 100;
    if (marginPct >= 25) return -0.25;
    if (marginPct >= 15) return 0;
    if (marginPct >= 8) return 0.25;
    return 0.5;
  }
  
  function monthlyPayment(principal, annualRate, months) {
    if (!principal || !months) return 0;
    const r = annualRate / 100 / 12;
    if (r === 0) return Math.round(principal / months);
    const m = (principal * r) / (1 - Math.pow(1 + r, -months));
    return Math.round(m);
  }
  
  /**
   * Compute financing terms for a car + bank.
   * @param {object} car  { price, cost, year, mileage, body, fuel }
   * @param {string} bank
   * @param {object} [opts] { defaults, overrides, meta }
   */
  function computeTerms(car, bank, opts = {}) {
    const partner = PARTNER_BY_BANK[bank];
    if (!partner && !opts.defaults) {
      throw new Error(`Unknown finance partner: ${bank}`);
    }
  
    const config = opts.defaults || partner.defaults;
    const meta = opts.meta || partner;
    const price = Number(car.price || 0);
    const maxRate = config.maxRate ?? BOUNDS.rate.max;
  
    /* rate */
    let rate = config.rate;
    rate += agePenalty(car.year);
    rate += mileagePenalty(car.mileage);
    rate += fuelAdjustment(car.fuel).rate;
    rate += marginAdjustment(car.cost, car.price);
    rate = clamp(roundTo(rate, 0.25), { min: BOUNDS.rate.min, max: maxRate });
  
    /* deposit */
    let deposit = config.deposit;
    deposit += priceTierDeposit(car.price);
    deposit += bodyAdjustment(car.body).deposit;
    deposit = clamp(roundTo(deposit, 1), BOUNDS.deposit);
  
    /* term */
    let term = config.term;
    term += bodyAdjustment(car.body).term;
    term += fuelAdjustment(car.fuel).term;
    const age = Math.max(0, new Date().getFullYear() - Number(car.year || 0));
    if (age > 10) term -= 24;
    else if (age > 7) term -= 12;
    else if (age > 5) term -= 6;
    term = clamp(roundTo(term, 6), BOUNDS.term);
  
    /* per-car overrides win */
    const overrides = opts.overrides || {};
    if (overrides.rate != null)    rate = clamp(Number(overrides.rate), BOUNDS.rate);
    if (overrides.deposit != null) deposit = clamp(Number(overrides.deposit), BOUNDS.deposit);
    if (overrides.term != null)    term = clamp(Number(overrides.term), BOUNDS.term);
  
    /* amounts */
    const maxAmount = Math.max(0, Math.round(price * (1 - deposit / 100)));
    const monthly = monthlyPayment(maxAmount, rate, term);
  
    return {
      bank: meta.bank,
      fullName: meta.fullName,
      logo: meta.logo,
      color: meta.color,
      rate,
      deposit,
      term,
      maxAmount,
      monthly,
      breakdown: {
        base: config,
        age: agePenalty(car.year),
        mileage: mileagePenalty(car.mileage),
        fuel: fuelAdjustment(car.fuel),
        body: bodyAdjustment(car.body),
        margin: marginAdjustment(car.cost, car.price),
        priceTier: priceTierDeposit(car.price),
        overrides,
      },
    };
  }
  
  module.exports = {
    FINANCE_BANKS,
    BOUNDS,
    computeTerms,
    monthlyPayment,
  };