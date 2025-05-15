import nodemailer from "nodemailer";

/**
 * Mail configuration for HomiTutor platform
 * 
 * This module sets up the email transport based on the environment.
 * - Development: Uses Gmail SMTP with App Password
 * - Production: Uses configured SMTP server from environment variables
 * 
 * See /docs/email-setup-guide.md for detailed setup instructions
 */

// Function to clean App Password by removing spaces
const cleanAppPassword = (password: string): string => {
  return password.replace(/\s+/g, '');
};

// Create a transporter for sending emails
let transporter: nodemailer.Transporter;

// Get sanitized credentials
const user = process.env.SMTP_USER || 'tranhuuloi2k3@gmail.com';
const pass = process.env.SMTP_PASS ? cleanAppPassword(process.env.SMTP_PASS) : 'fshshgqnxobcghf';

if (process.env.NODE_ENV === "production") {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
  });
  console.log(`Mail configured for PRODUCTION using ${process.env.SMTP_HOST}`);
} else {  // Using Gmail SMTP for development
  // Gmail configuration
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
    // Additional configuration for reliability
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  }); console.log(`Mail configured for DEVELOPMENT using Gmail (${user})`);
}

// Verify connection configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ SMTP Connection Error:", error);
    console.log("Please check your Gmail login and App Password");
    console.log("For detailed setup instructions, see: docs/email-setup-guide.md");
  } else {
    console.log("✅ SMTP server is ready to take messages"); console.log("Gmail connection successful, the system will send emails to real addresses");
  }
});

export default transporter;
