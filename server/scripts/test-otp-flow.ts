/**
 * Script kiểm tra quá trình gửi và xác thực OTP
 * Chạy với: npm run test:otp
 */

import otpService from "../services/otpService";
import { db } from "@db";
import { users, emailOtps } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

// Địa chỉ email test
const TEST_EMAIL = "test@example.com"; // Thay bằng email thật để test

async function testOtpSystem() {
  console.log("🧪 BẮT ĐẦU KIỂM TRA HỆ THỐNG OTP");
  console.log("=================================");

  try {
    // Kiểm tra xem user đã tồn tại chưa (chỉ cho mục đích test)
    const user = await db.query.users.findFirst({
      where: eq(users.email, TEST_EMAIL)
    });

    if (!user) {
      console.log(`❌ Không tìm thấy người dùng với email ${TEST_EMAIL} trong database`);
      console.log("❓ Vui lòng đăng ký trước hoặc sửa TEST_EMAIL trong script");
      return;
    }

    console.log(`✅ Tìm thấy người dùng: ${TEST_EMAIL}`);

    // Kiểm tra tình trạng OTP hiện tại
    const currentOtps = await db.query.emailOtps.findMany({
      where: eq(emailOtps.email, TEST_EMAIL),
      orderBy: (otps) => [desc(otps.created_at)]
    });

    if (currentOtps.length > 0) {
      console.log(`🔍 Hiện có ${currentOtps.length} OTP trong database cho ${TEST_EMAIL}`);
      console.log(`🔍 OTP mới nhất được tạo lúc: ${new Date(currentOtps[0].created_at).toLocaleString()}`);
    } else {
      console.log(`🔍 Chưa có OTP nào trong database cho ${TEST_EMAIL}`);
    }

    // Tạo và gửi OTP đầu tiên
    console.log("\n🔄 TEST 1: Gửi OTP lần đầu tiên");
    console.log("-------------------------------");
    try {
      const otp1 = await otpService.generateAndSendOtp(TEST_EMAIL);
      console.log(`✅ OTP1 đã được tạo và gửi thành công: ${otp1}`);
    } catch (error) {
      console.error(`❌ Không gửi được OTP1:`, error);
    }

    // Cố gắng gửi OTP thứ hai ngay lập tức (nên bị rate limit)
    console.log("\n🔄 TEST 2: Kiểm tra rate limiting (gửi OTP thứ hai ngay lập tức)");
    console.log("-------------------------------------------------------");
    try {
      const otp2 = await otpService.generateAndSendOtp(TEST_EMAIL);
      console.log(`⚠️ OTP2 đã được tạo và gửi thành công mặc dù có rate limit: ${otp2}`);
      console.log("⚠️ Rate limiting có vẻ không hoạt động! Cần kiểm tra lại!");
    } catch (error) {
      console.log(`✅ Rate limiting hoạt động tốt: ${error.message}`);
    }

    // Lấy OTP mới nhất để thử xác thực
    const latestOtp = await db.query.emailOtps.findFirst({
      where: and(
        eq(emailOtps.email, TEST_EMAIL),
        eq(emailOtps.used, false)
      ),
      orderBy: (otps) => [desc(otps.created_at)]
    });

    if (!latestOtp) {
      console.log("❌ Không tìm thấy OTP hợp lệ để test xác thực");
      return;
    }

    // Chú ý: Chúng ta không thể lấy OTP gốc từ database vì nó đã được hash
    console.log("\n⚠️ Không thể test xác thực tự động vì OTP đã được hash trong database.");
    console.log("⚠️ Để test xác thực, vui lòng sử dụng OTP được log trong console ở bước trước.");
    console.log("⚠️ Bạn có thể sử dụng API để xác thực OTP thủ công:");
    console.log(`⚠️ POST /api/v1/verify/verify-otp với body: {"email": "${TEST_EMAIL}", "otp": "<mã otp>"}`);

    // Danh sách các OTP hiện tại sau khi test
    const finalOtps = await db.query.emailOtps.findMany({
      where: eq(emailOtps.email, TEST_EMAIL),
      orderBy: (otps) => [desc(otps.created_at)]
    });

    console.log("\n📊 KẾT QUẢ KIỂM TRA");
    console.log("===================");
    console.log(`📧 Email test: ${TEST_EMAIL}`);
    console.log(`🔢 Tổng số OTP trong database: ${finalOtps.length}`);
    console.log(`🚫 Số OTP đã được sử dụng: ${finalOtps.filter(o => o.used).length}`);
    console.log(`✅ Số OTP chưa sử dụng: ${finalOtps.filter(o => !o.used).length}`);

    if (finalOtps.filter(o => !o.used).length > 1) {
      console.log("⚠️ CẢNH BÁO: Có nhiều hơn 1 OTP chưa sử dụng! Cần kiểm tra lại logic vô hiệu hóa OTP cũ.");
    } else {
      console.log("✅ Chỉ có tối đa 1 OTP hợp lệ - Đúng như mong đợi!");
    }

    console.log("\n✨ HOÀN THÀNH KIỂM TRA");
  } catch (error) {
    console.error("❌ Lỗi khi test hệ thống OTP:", error);
  } finally {
    // Đóng kết nối DB
    process.exit(0);
  }
}

// Chạy test
testOtpSystem();
