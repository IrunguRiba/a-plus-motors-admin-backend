const {
    ALLOWED_STATUS,
    pickModel,
    metaFrom,
    badRequest,
    notFound,
    serverError,
    handleDuplicate,
    handleValidation,
  } = require("../../helpers/pickModel");
  
  const CarRecord = require("../models/car");
  
  module.exports = {
    createRequest: async (req, res) => {
      try {
        const { model, type } = pickModel(req);
  
        if (!model) {
          return badRequest(res, `Unknown request type: ${type}`);
        }
  
        const payload = { ...req.body };
        delete payload.type;
        delete payload.code;
        delete payload.requestStatus;
        delete payload.adminNote;
  
        Object.assign(payload, metaFrom(req));
  
        // car inquiry → snapshot the car at submission time
        if (type === "inquiry" && payload.carId) {
          const car = await CarRecord.findById(payload.carId).lean();
  
          if (!car) {
            return badRequest(res, "Car not found for this inquiry.");
          }
  
          payload.carSnapshot = {
            name: `${car.year} ${car.make} ${car.model}`,
            stockNo: car.stockNo,
            year: car.year,
            make: car.make,
            model: car.model,
            price: car.price,
            priceFormatted: payload.carPrice,
            photo: car.photos?.[0],
          };
          payload.carPriceValue = car.price;
          payload.carName = payload.carName || payload.carSnapshot.name;
        }
  
        const doc = await model.create(payload);
  
        return res.status(201).json({
          success: true,
          message: "Request received.",
          code: doc.code,
          request: doc,
        });
      } catch (err) {
        if (handleDuplicate(res, err)) return;
        if (handleValidation(res, err)) return;
        return serverError(res, "createRequest", err);
      }
    },
  
    updateRequest: async (req, res) => {
      try {
        const { model, type } = pickModel(req);
  
        if (!model) {
          return badRequest(res, `Unknown request type: ${type}`);
        }
  
        const byCode = req.params.code;
        const byId = req.params.id;
  
        if (!byCode && !byId) {
          return badRequest(res, "Request id or code is required.");
        }
  
        const query = byCode ? { code: byCode } : { _id: byId };
        const doc = await model.findOne(query);
  
        if (!doc) return notFound(res);
  
        const { requestStatus, adminNote } = req.body;
  
        if (requestStatus !== undefined) {
          if (!ALLOWED_STATUS.includes(requestStatus)) {
            return badRequest(
              res,
              `Invalid status. Allowed: ${ALLOWED_STATUS.join(", ")}`
            );
          }
          doc.requestStatus = requestStatus;
  
          // auto-stamp completion time
          if (requestStatus === "Completed" && !doc.resolvedAt) {
            doc.resolvedAt = new Date();
          }
        }
  
        if (adminNote !== undefined) {
          doc.adminNote = String(adminNote).trim();
        }
  
        // track who made the last change
        if (req.user?._id) {
          doc.resolvedBy = req.user._id;
        }
  
        await doc.save();
  
        return res.json({
          success: true,
          message: "Request updated.",
          code: doc.code,
          request: doc,
        });
      } catch (err) {
        if (handleDuplicate(res, err)) return;
        if (err.name === "CastError") {
          return badRequest(res, "Invalid request id.");
        }
        if (handleValidation(res, err)) return;
        return serverError(res, "updateRequest", err);
      }
    },
    const ALL_MODELS = {
      inquiry: require("../models/inquiry"),
      contact: require("../models/contact"),
      // add any other request types that pickModel supports
    };
    
    getRequest: async (req, res) => {
      try {
        const { model, type } = pickModel(req);
    
        // ---------- 1. Single lookup by id or code (requires a type) ----------
        const byId = req.params.id;
        const byCode = req.params.code;
    
        if (byId || byCode) {
          if (!model) {
            return badRequest(res, `Unknown request type: ${type}`);
          }
    
          const query = byCode ? { code: byCode } : { _id: byId };
          const doc = await model.findOne(query).lean();
    
          if (!doc) return notFound(res);
    
          return res.json({ success: true, request: doc });
        }
    
        // ---------- 2. Build filter (shared by single-type and all-types) ----------
        const {
          requestStatus,
          code,
          search,
          startDate,
          endDate,
          page = 1,
          limit = 20,
          sortBy = "createdAt",
          sortOrder = "desc",
        } = req.query;
    
        const filter = {};
    
        if (requestStatus) {
          const statuses = String(requestStatus)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    
          const invalid = statuses.filter((s) => !ALLOWED_STATUS.includes(s));
          if (invalid.length) {
            return badRequest(
              res,
              `Invalid status: ${invalid.join(", ")}. Allowed: ${ALLOWED_STATUS.join(", ")}`
            );
          }
          filter.requestStatus = { $in: statuses };
        }
    
        if (code) filter.code = String(code).trim();
    
        if (search) {
          const rx = new RegExp(escapeRegex(String(search).trim()), "i");
          filter.$or = [
            { fullName: rx },
            { email: rx },
            { phone: rx },
            { carName: rx },
            { "carSnapshot.name": rx },
          ];
        }
    
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) filter.createdAt.$gte = new Date(startDate);
          if (endDate) filter.createdAt.$lte = new Date(endDate);
    
          if (isNaN(filter.createdAt.$gte) || isNaN(filter.createdAt.$lte)) {
            return badRequest(res, "Invalid date range.");
          }
        }
    
        // ---------- pagination + sorting ----------
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * pageSize;
    
        const allowedSortFields = ["createdAt", "updatedAt", "code", "requestStatus"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortDir = sortOrder === "asc" ? 1 : -1;
    
        // ---------- 3a. Single type list ----------
        if (model) {
          const sortQuery = { [sortField]: sortDir };
    
          const [items, total] = await Promise.all([
            model.find(filter).sort(sortQuery).skip(skip).limit(pageSize).lean(),
            model.countDocuments(filter),
          ]);
    
          return res.json({
            success: true,
            count: items.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / pageSize) || 0,
            requests: items,
          });
        }
    
        // ---------- 3b. All types list (no :type given) ----------
        const entries = Object.entries(ALL_MODELS);
    
        if (entries.length === 0) {
          return res.json({
            success: true,
            count: 0,
            total: 0,
            page: pageNum,
            totalPages: 0,
            requests: [],
          });
        }
    
        const perModel = await Promise.all(
          entries.map(async ([modelType, M]) => {
            const [docs, count] = await Promise.all([
              M.find(filter).sort({ [sortField]: sortDir }).lean(),
              M.countDocuments(filter),
            ]);
            return {
              docs: docs.map((d) => ({ ...d, _requestType: modelType })),
              count,
            };
          })
        );
    
        const allDocs = perModel.flatMap((p) => p.docs);
        const total = perModel.reduce((sum, p) => sum + p.count, 0);
    
        allDocs.sort((a, b) => {
          const av = a[sortField];
          const bv = b[sortField];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av < bv) return -sortDir;
          if (av > bv) return sortDir;
          return 0;
        });
    
        const items = allDocs.slice(skip, skip + pageSize);
    
        return res.json({
          success: true,
          count: items.length,
          total,
          page: pageNum,
          totalPages: Math.ceil(total / pageSize) || 0,
          requests: items,
        });
      } catch (err) {
        if (err.name === "CastError") {
          return badRequest(res, "Invalid request id.");
        }
        return serverError(res, "getRequest", err);
      }
    },
  };