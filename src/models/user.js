const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String, unique: true, required: true,
      trim: true, lowercase: true, minlength: 3, maxlength: 40,
    },
    email: {
      type: String, unique: true, required: true, trim: true, lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    phoneNumber: {
      type: String, unique: true, required: true, trim: true,
      match: [/^\+?[\d\s-]{9,16}$/, 'Invalid phone number'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    passwordResetToken:     { type: String, select: false },
passwordResetExpiresAt: { type: Date,   select: false },
    yard: { type: String, enum: ['main', 'cbd'], default: 'main', index: true },
    role: {
      type: String,
      enum: [ 'staff', 'salesperson', 'admin'],
      default: 'staff',
      index: true,
    },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const Users = mongoose.model('Users', userSchema);
module.exports = Users;