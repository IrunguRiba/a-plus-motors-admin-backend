const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordReset(email, resetUrl) {
  console.log('[mail] sendPasswordReset CALLED for:', email);

  const info = await transporter.sendMail({
    from: `"A Plus Motors" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your password',
    html: `
      <p>Someone requested a password reset for ${email}.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request it, ignore this email.</p>
    `,
  });

  console.log('[mail] sendMail response:', {
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    messageId: info.messageId,
  });

  return info;
}

module.exports = { sendPasswordReset };