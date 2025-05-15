/**
 * Service for handling email verification and OTP operations
 */

/**
 * Send OTP verification code to the specified email
 * @param email The email to send the OTP to
 */
export const sendOtp = async (email: string): Promise<any> => {
  try {
    const response = await fetch("/api/v1/verify/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Đặc biệt xử lý lỗi 429 (Too Many Requests)
      if (response.status === 429) {
        // Trả về một đối tượng với thuộc tính success: false để frontend biết
        // nhưng với thông báo thân thiện hơn và không gây gián đoạn
        return {
          success: false,
          rateLimited: true,
          message: "Mã OTP đã gửi thành công."
        };
      }
      throw new Error(data.message || "Failed to send OTP");
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || "Something went wrong when sending OTP");
  }
};

/**
 * Verify OTP code for the specified email
 * @param email The email associated with the OTP
 * @param otp The OTP code to verify
 */
export const verifyOtp = async (email: string, otp: string): Promise<any> => {
  try {
    const response = await fetch("/api/v1/verify/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Invalid or expired OTP");
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || "Something went wrong when verifying OTP");
  }
};

/**
 * Verify OTP code for the specified email using the auth endpoint
 * This is similar to verifyOtp but uses the auth endpoint instead
 * @param email The email associated with the OTP
 * @param otp The OTP code to verify
 */
export const verifyOtpAuth = async (email: string, otp: string): Promise<any> => {
  try {
    const response = await fetch("/api/v1/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Invalid or expired OTP");
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || "Something went wrong when verifying OTP");
  }
};

const verificationService = {
  sendOtp,
  verifyOtp,
  verifyOtpAuth
};

export default verificationService;
