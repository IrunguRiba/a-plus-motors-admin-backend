const Car = require('../models/car');

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(v);

const idQuery = (id) => (isObjectId(id) ? { _id: id } : { id });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readPayload(req) {
  const raw = req.body?.data;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === 'object') return raw;
  return req.body || {};
}

/**
 * Recursively merges `updates` into a loaded mongoose document.
 * Plain objects merge key-by-key (so `finance: { overrides: { rate: 12 } }`
 * preserves other overrides and other finance fields).
 * Arrays, dates, and primitives replace wholesale.
 */
function applyUpdates(doc, updates, prefix = '') {
  for (const [key, value] of Object.entries(updates)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const current = doc.get(path);

    const isPlainObject =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date);

    const currentIsObject =
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      !(current instanceof Date);

    if (isPlainObject && currentIsObject) {
      applyUpdates(doc, value, path);
    } else {
      doc.set(path, value);
    }
  }
}

module.exports = {
  createCar: async (req, res) => {
    try {
      const data = readPayload(req);
      if (data === null) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON in "data" field',
        });
      }

      const car = await Car.create({ ...data });

      res.status(201).json({
        success: true,
        id: car.id,
        stockNo: car.stockNo,
        _id: car._id,
        data: car,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate stockNo',
        });
      }
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: err.message,
          errors: err.errors,
        });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  },

  updateCar: async (req, res) => {
    try {
      const payload = readPayload(req);
      if (payload === null) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON in "data" field',
        });
      }

      const { stockNo, id, _id, ...updates } = payload;

      let query;
      if (stockNo) {
        query = { stockNo };
      } else if (_id) {
        query = idQuery(_id);
      } else if (id) {
        query = idQuery(id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Provide stockNo or _id in the request body',
        });
      }

      delete updates._id;
      delete updates.stockNo;

      if (!Object.keys(updates).length) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update',
        });
      }

      const car = await Car.findOne(query);
      if (!car) {
        return res.status(404).json({ success: false, message: 'Car not found' });
      }

      applyUpdates(car, updates);
      await car.save();

      const plain = car.toObject({ virtuals: true });

      res.json({
        success: true,
        stockNo: plain.stockNo,
        _id: plain._id,
        data: plain,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate stockNo',
        });
      }
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: err.message,
          errors: err.errors,
        });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  },

  findAll: async (req, res) => {
    try {
      const { page = 1, limit = 20, sort = '-createdAt' } = req.query || {};

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const sortObj = {};
      String(sort).split(',').forEach((s) => {
        const dir = s.startsWith('-') ? -1 : 1;
        sortObj[s.replace(/^-/, '')] = dir;
      });

      const [cars, total] = await Promise.all([
        Car.find()
          .sort(sortObj)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        Car.countDocuments(),
      ]);

      res.status(200).json({
        success: true,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: cars.length,
        cars,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Sorry, something went wrong. Try again',
      });
    }
  },

  findById: async (req, res) => {
    try {
      const paramId = req.params?.id;
      const payload = readPayload(req);
      const { stockNo, _id } = payload;

      let query;
      if (paramId) {
        query = isObjectId(paramId) ? { _id: paramId } : { stockNo: paramId };
      } else if (stockNo) {
        query = { stockNo };
      } else if (_id) {
        query = idQuery(_id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Provide stockNo or _id',
        });
      }

      const car = await Car.findOne(query).lean();
      if (!car) {
        return res.status(404).json({ success: false, message: 'Car not found' });
      }

      res.json({
        success: true,
        stockNo: car.stockNo,
        _id: car._id,
        data: car,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  searchCar: async (req, res) => {
    try {
      const {
        q,
        page = 1,
        limit = 20,
        sort = '-createdAt',
        ...filters
      } = req.body || {};

      const query = {};
      if (typeof q === 'string' && q.trim()) {
        const rx = new RegExp(`^${escapeRegex(q.trim())}`, 'i');
        query.$or = [
          { stockNo: rx },
          ...(isObjectId(q.trim()) ? [{ _id: q.trim() }] : []),
          { make: rx },
          { model: rx },
          { vin: rx },
          { body: rx },
          { colour: rx },
          { source: rx },
          { branch: rx },
          { salesperson: rx },
        ];
      }

      const schemaPaths = Car.schema.paths;
      for (const [key, val] of Object.entries(filters)) {
        const path = schemaPaths[key];
        if (!path || val === '' || val === undefined || val === null) continue;

        if (path.instance === 'Boolean') {
          query[key] = val === true || val === 'true';
        } else if (path.instance === 'Number') {
          const n = Number(val);
          if (!Number.isNaN(n)) query[key] = n;
        } else if (path.instance === 'Array') {
          query[key] = {
            $in: Array.isArray(val)
              ? val
              : String(val).split(',').map((s) => s.trim()),
          };
        } else {
          query[key] = val;
        }
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const sortObj = {};
      String(sort).split(',').forEach((s) => {
        const dir = s.startsWith('-') ? -1 : 1;
        sortObj[s.replace(/^-/, '')] = dir;
      });

      const [data, total] = await Promise.all([
        Car.find(query)
          .sort(sortObj)
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        Car.countDocuments(query),
      ]);

      res.json({
        success: true,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        count: data.length,
        data,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteCar: async (req, res) => {
    try {
      const { stockNo, _id } = req.body || {};

      let query;
      if (stockNo) {
        query = { stockNo };
      } else if (_id) {
        query = idQuery(_id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Provide stockNo, _id in the request body',
        });
      }

      const car = await Car.findOneAndDelete(query).lean();
      if (!car) {
        return res.status(404).json({ success: false, message: 'Car not found' });
      }

      res.json({
        success: true,
        message: 'Car deleted',
        data: { _id: car._id, stockNo: car.stockNo },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};