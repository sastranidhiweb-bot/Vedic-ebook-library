import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: (process.env.EMAIL_SECURE || 'false') === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOtpEmail = async (to, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required for OTP emails');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Password Reset OTP',
    text: `Your OTP code for password reset is: ${otp}\nThis code will expire in 10 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};
