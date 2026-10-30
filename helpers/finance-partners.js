/**
 * Finance partner catalogue — the single source of truth for banks,
 * their display metadata, and their base financing defaults.
 * `bank` values MUST match FINANCE_BANKS on the CarRecord schema.
 */

const FINANCE_PARTNERS = [
    {
      bank: "NIC Group",
      fullName: "National Industrial Credit Bank",
      logo: "/logos/finance/nic-group.svg",
      color: "#0a4d8c",
      defaults: { rate: 14, deposit: 20, term: 60, maxRate: 18 },
    },
    {
      bank: "UNAITAS SACCO",
      fullName: "Unaitas Sacco Society Limited",
      logo: "/logos/finance/unaitas.svg",
      color: "#1f7a3f",
      defaults: { rate: 13, deposit: 20, term: 60, maxRate: 17 },
    },
    {
      bank: "CO-OP",
      fullName: "Co-operative Bank of Kenya",
      logo: "/logos/finance/co-op.svg",
      color: "#00693e",
      defaults: { rate: 13, deposit: 20, term: 60, maxRate: 17 },
    },
    {
      bank: "FAMILY",
      fullName: "Family Bank Limited",
      logo: "/logos/finance/family.svg",
      color: "#b02a30",
      defaults: { rate: 14, deposit: 20, term: 60, maxRate: 18 },
    },
    {
      bank: "SPIRE",
      fullName: "Spire Bank Limited",
      logo: "/logos/finance/spire.svg",
      color: "#2b3a8f",
      defaults: { rate: 15, deposit: 20, term: 60, maxRate: 19 },
    },
    {
      bank: "KWFT",
      fullName: "Kenya Women Microfinance Bank PLC",
      logo: "/logos/finance/kwft.svg",
      color: "#7a1f6b",
      defaults: { rate: 14, deposit: 15, term: 48, maxRate: 18 },
    },
    {
      bank: "Stanbic Bank",
      fullName: "Stanbic Bank Kenya Limited",
      logo: "/logos/finance/stanbic.svg",
      color: "#1b4fd8",
      defaults: { rate: 12.5, deposit: 20, term: 60, maxRate: 16 },
    },
    {
      bank: "KCB",
      fullName: "KCB Bank Kenya Limited",
      logo: "/logos/finance/kcb.svg",
      color: "#1a8a4a",
      defaults: { rate: 13, deposit: 20, term: 60, maxRate: 17 },
    },
    {
      bank: "NCBA",
      fullName: "NCBA Bank Kenya PLC",
      logo: "/logos/finance/ncba.svg",
      color: "#b45f06",
      defaults: { rate: 13.5, deposit: 25, term: 48, maxRate: 17.5 },
    },
    {
      bank: "Absa",
      fullName: "Absa Bank Kenya Plc",
      logo: "/logos/finance/absa.svg",
      color: "#8b1c4a",
      defaults: { rate: 12.5, deposit: 15, term: 72, maxRate: 16 },
    },
  ];
  
  const FINANCE_BANKS = FINANCE_PARTNERS.map((p) => p.bank);
  
  const PARTNER_BY_BANK = Object.fromEntries(
    FINANCE_PARTNERS.map((p) => [p.bank, p])
  );
  
  function partnerFor(bank) {
    return PARTNER_BY_BANK[bank];
  }
  
  module.exports = {
    FINANCE_PARTNERS,
    FINANCE_BANKS,
    PARTNER_BY_BANK,
    partnerFor,
  };