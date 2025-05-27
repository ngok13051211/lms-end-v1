// Test script for tutor revenue statistics endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/v1';

// Test function to check the endpoint
async function testTutorRevenueStats() {
    try {
        console.log('Testing Tutor Revenue Statistics Endpoint...\n');

        // Note: This endpoint requires authentication with a tutor role
        // In a real test, you would need to:
        // 1. Login as a tutor to get a JWT token
        // 2. Include the token in the request headers

        console.log('❌ This endpoint requires authentication.');
        console.log('To test properly, you need to:');
        console.log('1. Login as a tutor user');
        console.log('2. Get the JWT token');
        console.log('3. Include it in the Authorization header\n');

        console.log('Sample usage after authentication:');
        console.log('GET /api/v1/tutors/statistics/revenue');
        console.log('Headers: { Authorization: "Bearer <your-jwt-token>" }');
        console.log('\nQuery parameters:');
        console.log('- type: "day" | "month" | "year" (default: "month")');
        console.log('- month: 1-12 (for filtering by specific month)');
        console.log('- year: YYYY (default: current year)');
        console.log('- fromDate: YYYY-MM-DD (start date for filtering)');
        console.log('- toDate: YYYY-MM-DD (end date for filtering)');
        console.log('\nExample responses:');
        console.log('[');
        console.log('  { "period": "2025-01", "revenue": 1500000 },');
        console.log('  { "period": "2025-02", "revenue": 2000000 },');
        console.log('  { "period": "2025-03", "revenue": 1750000 }');
        console.log(']');

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testTutorRevenueStats();
