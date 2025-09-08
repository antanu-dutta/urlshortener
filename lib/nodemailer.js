import nodemailer from "nodemailer";
// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "jody31@ethereal.email",
    pass: "saNbWeTBT4s5VjkQcG",
  },
});

export const sendMail = async (userInfo) => {
  const info = await transporter.sendMail({
    from: '"admin" <jody31@ethereal.email>',
    to: userInfo.email,
    subject: userInfo.subject,
    html: userInfo.html,
  });

  const testEmailUrl = nodemailer.getTestMessageUrl(info);
  return testEmailUrl;
};

// Wrap in an async IIFE so we can use await.
