import otpService from '../services/otpService';

/**
 * Tests the OTP service by sending a test email with OTP
 */
async function testOtpService() {
  console.log('Testing OTP service...');

  try {
    const testEmail = 'test@example.com'; // Replace with your test email if you want to receive it

    console.log(`Generating OTP for ${testEmail}...`);
    const otp = otpService.generateOtp();
    console.log(`Generated OTP: ${otp}`);

    console.log('Saving OTP to database...');
    const savedOtp = await otpService.saveOtp(testEmail, otp);
    console.log('OTP saved successfully:', savedOtp);

    console.log(`Sending OTP email to ${testEmail}...`);
    await otpService.sendOtpEmail(testEmail, otp);
    console.log('OTP email sent successfully!');

    // Test verification
    console.log('Testing OTP verification...');
    const isValid = await otpService.verifyOtp(testEmail, otp);
    console.log('Verification result:', isValid);

    // Test verification again (should fail since it's marked as used)
    const isValidAgain = await otpService.verifyOtp(testEmail, otp);
    console.log('Verification result (should be false):', isValidAgain);

    console.log('OTP service test completed!');
  } catch (error) {
    console.error('Error testing OTP service:', error);
  }
}

// Run the test
testOtpService();
