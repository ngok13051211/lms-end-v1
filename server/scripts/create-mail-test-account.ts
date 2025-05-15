import nodemailer from 'nodemailer';

/**
 * Creates a test account with Ethereal.email for development
 */
async function createTestAccount() {
  console.log('Creating test account with Ethereal.email...');

  try {
    // Generate test SMTP service account
    const testAccount = await nodemailer.createTestAccount();

    console.log('Credentials obtained, printing configuration:');
    console.log('SMTP_HOST=' + testAccount.smtp.host);
    console.log('SMTP_PORT=' + testAccount.smtp.port);
    console.log('SMTP_SECURE=' + testAccount.smtp.secure);
    console.log('SMTP_USER=' + testAccount.user);
    console.log('SMTP_PASS=' + testAccount.pass);
    console.log('\nYou can add these to your .env file for testing.');
    console.log('\nWith these credentials, emails sent in development will be viewable at:');
    console.log('https://ethereal.email/login');
    console.log('Login with the credentials above.');
  } catch (error) {
    console.error('Failed to create a testing account:', error);
  }
}

createTestAccount();
