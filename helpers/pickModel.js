

const {
    PrivacyComplaint,
    CarInquiry,
    FinancingRequest,
    TradeInRequest,
    ImportRequest,
} = require("../src/models/requests");

const MODELS = {
    privacy: PrivacyComplaint,
    inquiry: CarInquiry,
    financing: FinancingRequest,
    "trade-in": TradeInRequest,
    import: ImportRequest,
};


const TYPE_BY_PREFIX = {
    PC: "privacy",
    CI: "inquiry",
    FR: "financing",
    TI: "trade-in",
    IR: "import",
};

const ALLOWED_STATUS = ["Sent", "Received", "Processing", "Completed"];

function pickModel(req) {
    const type = req.params.type || req.body.type;
    if (type) return { model: MODELS[type], type };

    const code = req.params.code;
    if (code && code.includes("-")) {
        const prefix = code.split("-")[0].toUpperCase();
        const resolved = TYPE_BY_PREFIX[prefix];
        return { model: MODELS[resolved], type: resolved };
    }

    return { model: undefined, type: undefined };
}

function metaFrom(req) {
    return {
        source: req.body.source || "web",
        ip: req.ip,
        userAgent: req.headers["user-agent"] || undefined,
    };
}

/* ============================================================
   RESPONSE SHORTCUTS
   ============================================================ */

function badRequest(res, message, extra) {
    return res.status(400).json({ success: false, message, ...(extra || {}) });
}

function notFound(res) {
    return res.status(404).json({ success: false, message: "Request not found" });
}

function serverError(res, label, err) {
    console.error(`[${label}]`, err);
    return res.status(500).json({ success: false, message: "Server error" });
}

function handleDuplicate(res, err) {
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "field";
        return res.status(409).json({
            success: false,
            message: `That ${field} is already in use.`,
        });
    }
    return null;
}

function handleValidation(res, err) {
    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: Object.fromEntries(
                Object.entries(err.errors).map(([k, v]) => [k, v.message])
            ),
        });
    }
    return null;
}

module.exports = {
    MODELS,
    TYPE_BY_PREFIX,
    ALLOWED_STATUS,

    pickModel,
    metaFrom,

    badRequest,
    notFound,
    serverError,

    handleDuplicate,
    handleValidation,
};