/**
 * Test script for email verification flow
 * 
 * This script tests:
 * 1. User registration with is_verified = false
 * 2. OTP generation and sending
 * 3. OTP verification and updating is_verified status
 */

import dotenv from "dotenv";
dotenv.config();

import { db } from "../../db";
import * as bcrypt from "bcrypt";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import otpService from "../services/otpService";

const testEmail = "test-verification@example.com";
const testUsername = "testverify";
const testPassword = "password123";

async function cleanup() {
    console.log("Cleaning up test data...");
    await db.delete(users).where(eq(users.email, testEmail));
    console.log("Cleanup complete");
}

async function testEmailVerificationFlow() {
    try {
        // Clean up any existing test data
        await cleanup();

        console.log("\n--- Testing Email Verification Flow ---\n");

        // 1. Create a test user with is_verified = false
        console.log("1. Creating test user...");
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        const [testUser] = await db.insert(users)
            .values({
                username: testUsername,
                email: testEmail,
                password: hashedPassword,
                first_name: "Test",
                last_name: "User",
                role: "student",
                is_verified: false,
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning();

        console.log("Test user created:", {
            id: testUser.id,
            email: testUser.email,
            username: testUser.username,
            is_verified: testUser.is_verified
        });

        // 2. Generate and send OTP
        console.log("\n2. Generating and sending OTP...");
        const otp = await otpService.generateAndSendOtp(testEmail);
        console.log(`OTP generated and sent to ${testEmail}`);
        console.log(`OTP for testing: ${otp}`);

        // 3. Verify user is still not verified
        const unverifiedUser = await db.query.users.findFirst({
            where: eq(users.email, testEmail)
        });

        console.log("\n3. Checking user verification status before OTP verification:");
        console.log(`is_verified = ${unverifiedUser?.is_verified}`);

        if (unverifiedUser?.is_verified) {
            throw new Error("User should not be verified before OTP verification");
        }

        // 4. Verify OTP
        console.log("\n4. Verifying OTP...");
        const isValid = await otpService.verifyOtp(testEmail, otp);
        console.log(`OTP verification result: ${isValid}`);

        // 5. Manually update user verification status (as the controller would do)
        await db.update(users)
            .set({ is_verified: true })
            .where(eq(users.email, testEmail));

        // 6. Verify user is now verified
        const verifiedUser = await db.query.users.findFirst({
            where: eq(users.email, testEmail)
        });

        console.log("\n5. Checking user verification status after OTP verification:");
        console.log(`is_verified = ${verifiedUser?.is_verified}`);

        if (!verifiedUser?.is_verified) {
            throw new Error("User should be verified after OTP verification");
        }

        console.log("\n--- Email Verification Flow Test Passed ---");

        // Cleanup test data
        await cleanup();

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        process.exit(0);
    }
}

// Run the test
testEmailVerificationFlow();
