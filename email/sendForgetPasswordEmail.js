import nodemailer from "nodemailer";

export const sendForgetPasswordEmail = async (email, name, token) => {
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const html = getResetPasswordTemplate(name, resetLink);

  await transporter.sendMail({
    from: `"Your App Name" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Your Password",
    html,
  });
};
