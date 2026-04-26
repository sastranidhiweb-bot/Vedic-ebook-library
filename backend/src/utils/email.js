import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "spvyaspujabook.hyd@gmail.com",
    pass: "sear nhgy dyhh oqxh",
  },
});

export const sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Password Reset OTP',
    text: `Your OTP code for password reset is: ${otp}\nThis code will expire in 10 minutes.`,
  };
  
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);
  await transporter.sendMail(mailOptions);
};
