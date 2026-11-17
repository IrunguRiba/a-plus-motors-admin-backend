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
  };