import { db } from "@db";
import { emailOtps } from "@shared/schema";
import * as bcrypt from "bcrypt";
import { eq, and, lt, not, desc } from "drizzle-orm";
import transporter from "../config/mail";

/**
 * Service for handling OTP (One-Time Password) operations
 */
class OtpService {
    /**
     * Generate a random 6-digit OTP code
     */
    generateOtp(): string {
        // Generate a 6-digit random number
        return Math.floor(100000 + Math.random() * 900000).toString();
    }    /**
     * Save OTP to database
     * @param email The email to associate with the OTP
     * @param otp The plain text OTP
     * @returns The saved OTP record
     */
    async saveOtp(email: string, otp: string) {
        try {
            // Hash the OTP for security before storing in the database
            const hashedOtp = await bcrypt.hash(otp, 10);

            // Set expiration time (5 minutes from now)
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 5);

            // First invalidate ALL existing OTPs for this email to avoid confusion
            const invalidateResult = await db
                .update(emailOtps)
                .set({ used: true })
                .where(eq(emailOtps.email, email));

            console.log(`Đã vô hiệu hóa ${invalidateResult.rowCount} mã OTP cũ cho ${email}`);

            // Now save the new OTP
            const [savedOtp] = await db
                .insert(emailOtps)
                .values({
                    email,
                    otp: hashedOtp,
                    expires_at: expiresAt,
                    created_at: new Date(),
                })
                .returning();

            console.log(`Đã lưu OTP mới với ID=${savedOtp.id} cho ${email}, hết hạn lúc: ${expiresAt.toISOString()}`);

            return savedOtp;
        } catch (error) {
            console.error("Error saving OTP:", error);
            throw new Error("Failed to save OTP");
        }
    }    /**
     * Send OTP email to the user
     * @param email Recipient email
     * @param otp The OTP code to send
     */
    async sendOtpEmail(email: string, otp: string) {
        try {
            console.log(`[${new Date().toISOString()}] Đang chuẩn bị gửi mã OTP ${otp} tới địa chỉ ${email}...`);

            // Email template
            const mailOptions = {
                from: process.env.MAIL_FROM || "HomiTutor <noreply@homitutor.vn>",
                to: email,
                subject: "Mã xác thực OTP - HomiTutor",
                html: this.getEmailTemplate(otp),
            };

            // Log OTP một cách rõ ràng để dễ debug
            console.log("\n=============================================");
            console.log(`📧 GỬI MÃ XÁC THỰC CHO: ${email}`);
            console.log(`🔑 MÃ OTP HỢP LỆ DUY NHẤT: ${otp}`);
            console.log(`⏰ THỜI GIAN GỬI: ${new Date().toLocaleString()}`);
            console.log("=============================================\n");

            // Gửi email thật đến địa chỉ email
            console.log("Đang kết nối tới SMTP server...");
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Email đã được gửi thành công đến ${email}!`);

            // Log thông tin chi tiết về email
            if (info.messageId) {
                console.log(`Email message ID: ${info.messageId}`);
            }

            if (info.preview) {
                console.log(`Preview URL: ${info.preview}`);
            } else if (info.response) {
                console.log(`Email response: ${info.response}`);
            }

            return info;
        } catch (error) {
            console.error(`❌ Lỗi gửi email OTP đến ${email}:`, error);
            throw new Error("Failed to send OTP email");
        }
    }/**
     * Verify OTP code against stored value
     * @param email The email associated with the OTP
     * @param otp The OTP to verify
     * @returns True if verification successful, false otherwise
     */
    async verifyOtp(email: string, otp: string): Promise<boolean> {
        try {
            // Get the NEWEST unused OTP for this email (sửa lại từ orderBy created_at ASC thành DESC)
            const storedOtp = await db.query.emailOtps.findFirst({
                where: and(
                    eq(emailOtps.email, email),
                    eq(emailOtps.used, false)
                ),
                orderBy: (otps) => [desc(otps.created_at)], // Lấy OTP mới nhất
            });

            if (!storedOtp) {
                console.log('No valid OTP found for email:', email);
                return false;
            }

            // Check if OTP has expired
            const now = new Date();
            const expiresAt = new Date(storedOtp.expires_at);

            if (now > expiresAt) {
                console.log('OTP expired. Current time:', now, 'Expires at:', expiresAt);
                return false;
            }

            // Verify OTP
            const isValid = await bcrypt.compare(otp, storedOtp.otp);
            console.log(`OTP validation for ${email}: ${isValid ? 'SUCCESS' : 'FAILED'}`);

            if (isValid) {
                // Mark OTP as used
                await db
                    .update(emailOtps)
                    .set({ used: true })
                    .where(eq(emailOtps.id, storedOtp.id));
                // Đánh dấu tất cả OTP khác của email này là đã sử dụng (để tránh lầm lẫn)
                await db
                    .update(emailOtps)
                    .set({ used: true })
                    .where(and(
                        eq(emailOtps.email, email),
                        not(eq(emailOtps.id, storedOtp.id))
                    ));

                console.log(`OTP ${otp} cho ${email} đã được xác thực thành công và đánh dấu đã sử dụng`);
            } else {
                console.log(`OTP không hợp lệ cho ${email}. OTP đã nhập: ${otp}`);
            }

            return isValid;
        } catch (error) {
            console.error("Error verifying OTP:", error);
            throw new Error("Failed to verify OTP");
        }
    }

    /**
     * Create HTML email template for OTP
     * @param otp The OTP code to include in the template
     * @returns HTML template string
     */
    private getEmailTemplate(otp: string): string {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0;">Homi<span style="color: #10b981;">Tutor</span></h1>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #374151;">Xác thực email của bạn</h2>
          <p style="color: #6b7280; margin-bottom: 20px;">Vui lòng sử dụng mã xác thực bên dưới để hoàn tất quá trình xác thực:</p>
          <div style="background-color: #ffffff; padding: 15px; border: 1px dashed #d1d5db; border-radius: 5px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otp}</span>
          </div>
          <p style="color: #6b7280; margin-bottom: 0;">Mã xác thực có hiệu lực trong <strong>5 phút</strong>.</p>
          <p style="color: #6b7280; margin-top: 20px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
        </div>
        <div style="text-align: center; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} HomiTutor. Tất cả các quyền được bảo lưu.</p>
        </div>
      </div>
    `;
    }    /**
     * Check if we can send a new OTP (rate limiting)
     * @param email Email to check
     * @returns Boolean indicating if we can send new OTP
     */
    private async canSendNewOtp(email: string): Promise<boolean> {
        try {
            // Get the latest OTP for this email
            const latestOtp = await db.query.emailOtps.findFirst({
                where: eq(emailOtps.email, email),
                orderBy: (otps) => [desc(otps.created_at)],
            });

            if (!latestOtp) {
                return true; // No previous OTP, can send
            }

            // Check if the latest OTP was sent within the last 60 seconds
            const now = new Date();
            const otpCreationTime = new Date(latestOtp.created_at);
            const timeDifferenceInSeconds = (now.getTime() - otpCreationTime.getTime()) / 1000;

            // If less than 60 seconds have passed, refuse to send a new OTP
            if (timeDifferenceInSeconds < 60) {
                console.log(`Rate limiting OTP for ${email}. Last OTP sent ${Math.floor(timeDifferenceInSeconds)} seconds ago.`);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Error checking OTP rate limit:", error);
            return true; // In case of error, allow sending to avoid blocking legitimate users
        }
    }    /**
     * Generate and send OTP in one function
     * @param email Recipient email
     * @returns The generated OTP
     */
    async generateAndSendOtp(email: string): Promise<string> {
        try {
            // Check rate limiting
            const canSend = await this.canSendNewOtp(email);
            if (!canSend) {
                console.log(`OTP request rate-limited for ${email}`);

                // Thay vì ném lỗi, lấy OTP hiện tại và gửi lại nếu chưa hết hạn
                const latestOtp = await db.query.emailOtps.findFirst({
                    where: and(
                        eq(emailOtps.email, email),
                        eq(emailOtps.used, false)
                    ),
                    orderBy: (otps) => [desc(otps.created_at)],
                });

                if (latestOtp) {
                    const now = new Date();
                    const expiresAt = new Date(latestOtp.expires_at);

                    if (now < expiresAt) {
                        // Nếu OTP vẫn còn hiệu lực, giải mã và gửi lại
                        // Lưu ý: Chúng ta không thể lấy trực tiếp OTP từ DB vì nó đã được hash
                        console.log(`Gửi lại OTP đã tồn tại cho ${email}`);

                        // Thông báo lỗi rate limit nhưng vẫn cho biết OTP đã được gửi trước đó
                        throw new Error("OTP đã được gửi gần đây. Vui lòng kiểm tra email hoặc thử lại sau 60 giây.");
                    }
                }

                throw new Error("OTP đã được gửi gần đây. Vui lòng đợi 60 giây trước khi yêu cầu lại.");
            }

            // Chỉ tạo OTP mới và lưu vào DB khi không có OTP hợp lệ hoặc đã quá hạn
            const otp = this.generateOtp();
            await this.saveOtp(email, otp);
            await this.sendOtpEmail(email, otp);

            // Log rõ ràng để dễ debug
            console.log(`✅ OTP mới đã được tạo và gửi thành công: ${otp} cho ${email}`);

            return otp;
        } catch (error) {
            console.error("Error in generateAndSendOtp:", error);
            throw new Error(error instanceof Error ? error.message : "Failed to generate and send OTP");
        }
    }
}

export default new OtpService();
