# Email Setup Guide for HomiTutor

This guide explains how to properly set up email functionality for the HomiTutor platform, particularly for development environment using Gmail.

## Gmail Configuration for Development

To use Gmail for sending emails in development (for OTP verification and other notifications), follow these steps precisely:

### 1. Enable 2-Step Verification for Your Google Account

1. Go to your [Google Account Security Settings](https://myaccount.google.com/security)
2. Find and enable "2-Step Verification"
3. Complete the verification process

> **Note**: You CANNOT use Gmail's SMTP without 2-Step Verification enabled

### 2. Create an App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Select "Other" as the device name and enter "HomiTutor"
4. Click "Generate"
5. Google will display a 16-character password (with spaces)
6. **IMPORTANT**: Copy this password BUT REMOVE ALL SPACES before using it

### 3. Update Environment Variables

Update your `.env` file with these settings:

```
# Mail Settings
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-gmail-account@gmail.com"
SMTP_PASS="yourgeneratedapppasswordwithoutspaces"
MAIL_FROM="HomiTutor <your-gmail-account@gmail.com>"
```

### 4. Testing Your Configuration

Run the test script to verify your email configuration:

```bash
npm run test:mail
```

## Troubleshooting Common Issues

### Authentication Failed

If you see "Username and Password not accepted" error:

1. Make sure you've enabled 2-Step Verification
2. Verify that you created an App Password correctly
3. Ensure the App Password has NO SPACES in the `.env` file
4. Check that you're using the correct Gmail account
5. Regenerate the App Password if needed

### Connection Issues

If you're getting connection errors:

1. Check your internet connection
2. Verify that port 587 isn't blocked by your firewall
3. Try setting `SMTP_SECURE=true` and `SMTP_PORT=465` as an alternative

## Production Configuration

For production, we recommend using a dedicated transactional email service like SendGrid, Mailgun, or Amazon SES. The configuration pattern will follow what's in `mail.ts` but with your production service credentials.

## Need Help?

If you continue to face issues, contact the development team lead.
