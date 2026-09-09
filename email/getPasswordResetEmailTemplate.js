const getResetPasswordTemplate = (name, resetLink) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
    <h2 style="color: #333;">Reset Your Password</h2>
    
    <p>Hi ${name},</p>
    
    <p>We received a request to reset your password. Click the button below to proceed:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" 
         style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">
         Reset Password
      </a>
    </div>

    <p>This link will expire in <strong>24 hours</strong>.</p>

    <p>If you didn’t request this, please ignore this email.</p>

    <br/>
    <p>Thanks,<br/>Your Team</p>
  </div>
  `;
};

export default getResetPasswordTemplate;
