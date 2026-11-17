const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Users = require('../models/user');
const { signToken } = require('../../middlewares/auth');
const { sendPasswordReset } = require('../../helpers/mail');

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

module.exports = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'email and password required' });
      }

      const user = await Users.findOne({ email: String(email).toLowerCase() }).select('+password');
      if (!user || !user.active) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      return res.json({
        success: true,
        token: signToken(user),
        user: {
          _id: user._id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          yard: user.yard,
        },
      });
    } catch (err) {
      console.error('[login]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'email required' });
      }

      const user = await Users.findOne({ email: String(email).toLowerCase() });

      console.log('[forgotPassword] lookup:', {
        email,
        found: !!user,
        active: user?.active,
      });

      if (user && user.active) {
        console.log('[forgotPassword] generating token + sending email');

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpiresAt = new Date(Date.now() + RESET_TTL_MS);
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
        await sendPasswordReset(user.email, resetUrl);
      } else {
        console.log('[forgotPassword] SKIPPING — user not found or inactive');
      }

      return res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
      });
    } catch (err) {
      console.error('[forgotPassword]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;
      if (!email || !token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'email, token and newPassword are required',
        });
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }

      const user = await Users.findOne({ email: String(email).toLowerCase() })
        .select('+passwordResetToken +passwordResetExpiresAt +password');

      if (!user || !user.passwordResetToken || !user.passwordResetExpiresAt) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }
      if (user.passwordResetExpiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      if (hashedToken !== user.passwordResetToken) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();

      return res.json({ success: true, message: 'Password reset. You can log in now.' });
    } catch (err) {
      console.error('[resetPassword]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};