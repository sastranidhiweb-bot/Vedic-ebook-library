// Minimal nodemailer test script for Gmail SMTP
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***HIDDEN***' : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendTestMail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // send to yourself for test
      subject: 'Nodemailer Test',
      text: 'This is a test email from nodemailer.',
    });
    console.log('Test email sent:', info.response);
  } catch (err) {
    console.error('Error sending test email:', err);
  }
}

sendTestMail();
