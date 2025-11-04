import nodemailer from 'nodemailer';

const getTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD;
  
  console.log('Email credentials check:', { user: emailUser, pass: emailPass ? 'SET' : 'NOT SET' });
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string, userName: string) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"StockBuddy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'StockBuddy - Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You requested a password reset for your StockBuddy account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    const transporter = getTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};