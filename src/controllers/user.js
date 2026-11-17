const Users = require("../models/user");
const {
  ROLES,
  ADMIN,
  isAdmin,
  isSelf,
  normalizeRole,
} = require("../../helpers/roles");
const { signToken } = require("../../middlewares/auth");

module.exports = {
  createFirstAdmin: async (req, res) => {
    try {
      const existingAdmin = await Users.findOne({ role: ADMIN });
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: "An admin already exists. Use POST /api/admin/users instead.",
        });
      }

      const { userName, email, phoneNumber, password, yard } = req.body;

      if (!userName || !email || !phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: "userName, email, phoneNumber and password are required.",
        });
      }

      const user = await Users.create({
        userName,
        email,
        phoneNumber,
        password,
        yard: yard === "cbd" ? "cbd" : "main",
        role: ADMIN,
        active: true,
      });

      const safe = await Users.findById(
        user._id,
        "userName email phoneNumber yard role active createdAt updatedAt"
      ).lean();

      const token = signToken(user);

      return res.status(201).json({ success: true, token, user: safe });
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "field";
        return res.status(409).json({
          success: false,
          message: `That ${field} is already in use.`,
        });
      }
      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: Object.fromEntries(
            Object.entries(err.errors).map(([k, v]) => [k, v.message])
          ),
        });
      }
      console.error("[createFirstAdmin]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  createUser: async (req, res) => {
    try {
      const { userName, email, phoneNumber, password, yard, role } = req.body;

      if (!userName || !email || !phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: "userName, email, phoneNumber and password are required.",
        });
      }

      if (role !== undefined && !ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed: ${ROLES.join(", ")}`,
        });
      }

      const finalRole = isAdmin(req.user)
        ? normalizeRole(role, "user")
        : "user";

      if (finalRole === ADMIN) {
        const existingAdmin = await Users.findOne({ role: ADMIN });
        if (existingAdmin) {
          return res.status(409).json({
            success: false,
            message: "An admin already exists. Only one admin is allowed.",
          });
        }
      }

      const user = await Users.create({
        userName,
        email,
        phoneNumber,
        password,
        yard: yard || "main",
        role: finalRole,
      });

      const safe = await Users.findById(
        user._id,
        "userName email phoneNumber yard role active createdAt updatedAt"
      ).lean();

      return res.status(201).json({ success: true, user: safe });
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "field";
        return res.status(409).json({
          success: false,
          message: `That ${field} is already in use.`,
        });
      }
      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: Object.fromEntries(
            Object.entries(err.errors).map(([k, v]) => [k, v.message])
          ),
        });
      }
      console.error("[createUser]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
  transferAdmin: async (req, res) => {
    try {
      if (!isAdmin(req.user)) {
        return res.status(403).json({ success: false, message: "Admin only" });
      }
  
      const { toUserId } = req.body;
      if (!toUserId) {
        return res.status(400).json({ success: false, message: "toUserId required" });
      }
  
      if (String(req.user._id) === String(toUserId)) {
        return res.status(400).json({
          success: false,
          message: "Pick someone other than yourself.",
        });
      }
  
      const target = await Users.findById(toUserId);
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      if (target.role === ADMIN) {
        return res.status(400).json({
          success: false,
          message: "Target is already admin.",
        });
      }
  
      target.role = ADMIN;
      await target.save();
  
      await Users.findByIdAndUpdate(req.user._id, { role: "staff" });
  
      const safe = await Users.findById(
        target._id,
        "userName email phoneNumber yard role active createdAt updatedAt"
      ).lean();
  
      return res.json({
        success: true,
        message: `Admin role transferred to ${target.userName}.`,
        token: signToken(target),
        newAdmin: safe,
      });
    } catch (err) {
      if (err.name === "CastError") {
        return res.status(400).json({ success: false, message: "Invalid user id" });
      }
      console.error("[transferAdmin]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
  getCurrentAdmin: async (req, res) => {
    try {
      const user = await Users.findById(req.user._id).lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      if (user.role !== ADMIN) {
        return res.status(403).json({
          success: false,
          message: "Admin only.",
        });
      }

      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: "Account is disabled.",
        });
      }

      const token = signToken(user);

      return res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          userName: user.userName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          yard: user.yard,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err) {
      console.error("[getCurrentAdmin]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      if (!isAdmin(req.user)) {
        return res.status(403).json({ success: false, message: "Admin only" });
      }

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, parseInt(req.query.limit) || 20);

      const filter = {};
      if (req.query.role && ROLES.includes(req.query.role)) {
        filter.role = req.query.role;
      }
      if (req.query.yard) filter.yard = req.query.yard;
      if (req.query.active !== undefined) {
        filter.active = req.query.active === "true";
      }
      if (req.query.q) {
        const rx = new RegExp(req.query.q.trim(), "i");
        filter.$or = [{ userName: rx }, { email: rx }, { phoneNumber: rx }];
      }

      const [users, total] = await Promise.all([
        Users.find(
          filter,
          "userName email phoneNumber yard role active createdAt updatedAt"
        )
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Users.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
        count: users.length,
        users,
      });
    } catch (err) {
      console.error("[getAllUsers]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  getUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        if (!isAdmin(req.user)) {
          return res
            .status(403)
            .json({ success: false, message: "Admin only" });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);

        const filter = {};
        if (req.query.role && ROLES.includes(req.query.role)) {
          filter.role = req.query.role;
        }
        if (req.query.yard) filter.yard = req.query.yard;
        if (req.query.q) {
          const rx = new RegExp(req.query.q.trim(), "i");
          filter.$or = [{ userName: rx }, { email: rx }, { phoneNumber: rx }];
        }

        const [users, total] = await Promise.all([
          Users.find(
            filter,
            "userName email phoneNumber yard role active createdAt updatedAt"
          )
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
          Users.countDocuments(filter),
        ]);

        return res.json({
          success: true,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit) || 1,
          },
          count: users.length,
          users,
        });
      }

      if (!isSelf(req.user, id) && !isAdmin(req.user)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const user = await Users.findById(
        id,
        "userName email phoneNumber yard role active createdAt updatedAt"
      ).lean();

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return res.json({ success: true, user });
    } catch (err) {
      if (err.name === "CastError") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user id" });
      }
      console.error("[getUser]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  updateUserDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const self = isSelf(req.user, id);
      const admin = isAdmin(req.user);

      if (!self && !admin) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const user = await Users.findById(id).select("+password");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const oldRole = user.role;

      const allowed = ["userName", "email", "phoneNumber"];
      if (admin) allowed.push("yard", "role", "active");

      for (const key of allowed) {
        if (req.body[key] === undefined) continue;

        if (key === "role") {
          if (!ROLES.includes(req.body.role)) {
            return res.status(400).json({
              success: false,
              message: `Invalid role. Allowed: ${ROLES.join(", ")}`,
            });
          }
          if (self && admin && req.body.role !== ADMIN) {
            return res.status(400).json({
              success: false,
              message: "You cannot change your own role.",
            });
          }
          if (req.body.role === ADMIN && user.role !== ADMIN) {
            const existingAdmin = await Users.findOne({
              role: ADMIN,
              _id: { $ne: user._id },
            });
            if (existingAdmin) {
              return res.status(409).json({
                success: false,
                message: "An admin already exists. Demote them first.",
              });
            }
          }
        }

        user[key] = req.body[key];
      }

      const newPassword = req.body.newPassword ?? req.body.password;
      const currentPassword = req.body.currentPassword;

      if (newPassword !== undefined && newPassword !== "") {
        if (!admin) {
          if (!currentPassword) {
            return res.status(400).json({
              success: false,
              message: "currentPassword is required to change your password.",
            });
          }
          const ok = await user.comparePassword(currentPassword);
          if (!ok) {
            return res.status(401).json({
              success: false,
              message: "Current password is incorrect.",
            });
          }
        }

        if (String(newPassword).length < 8) {
          return res.status(400).json({
            success: false,
            message: "New password must be at least 8 characters.",
          });
        }

        user.password = newPassword;
      }

      await user.save();

      const safe = await Users.findById(
        id,
        "userName email phoneNumber yard role active createdAt updatedAt"
      ).lean();

      let token;
      if (oldRole !== user.role) {
        token = signToken(user);
      }

      return res.json({
        success: true,
        user: safe,
        ...(token ? { token } : {}),
      });
    } catch (err) {
      if (err.name === "CastError") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user id" });
      }
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "field";
        return res.status(409).json({
          success: false,
          message: `That ${field} is already in use.`,
        });
      }
      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: Object.fromEntries(
            Object.entries(err.errors).map(([k, v]) => [k, v.message])
          ),
        });
      }
      console.error("[updateUserDetails]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!isAdmin(req.user)) {
        return res.status(403).json({ success: false, message: "Admin only" });
      }

      if (isSelf(req.user, id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account.",
        });
      }

      const user = await Users.findByIdAndDelete(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return res.json({ success: true, message: "User deleted", id });
    } catch (err) {
      if (err.name === "CastError") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user id" });
      }
      console.error("[deleteUser]", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
};