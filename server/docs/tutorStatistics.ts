/**
 * @swagger
 * /api/v1/tutors/statistics/revenue:
 *   get:
 *     summary: Get tutor revenue statistics
 *     description: Returns revenue statistics for the authenticated tutor from completed booking requests
 *     tags: [Tutor Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Time period grouping type
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Specific month for filtering (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2025
 *         description: Specific year for filtering (defaults to current year)
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Start date for filtering (YYYY-MM-DD format)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: End date for filtering (YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Revenue statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   period:
 *                     type: string
 *                     description: Time period (format depends on type parameter)
 *                     example: "2025-01"
 *                   revenue:
 *                     type: number
 *                     format: float
 *                     description: Total revenue for the period in VND
 *                     example: 1500000
 *             examples:
 *               monthly:
 *                 summary: Monthly revenue statistics
 *                 value:
 *                   - period: "2025-01"
 *                     revenue: 1500000
 *                   - period: "2025-02"  
 *                     revenue: 2000000
 *                   - period: "2025-03"
 *                     revenue: 1750000
 *               daily:
 *                 summary: Daily revenue statistics
 *                 value:
 *                   - period: "2025-05-01"
 *                     revenue: 500000
 *                   - period: "2025-05-02"
 *                     revenue: 750000
 *                   - period: "2025-05-03"
 *                     revenue: 600000
 *               empty:
 *                 summary: No revenue data
 *                 value: []
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Month parameter must be between 1 and 12"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       403:
 *         description: Forbidden - tutor role required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Access denied: Insufficient permissions"
 *       404:
 *         description: Tutor profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tutor profile not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to get revenue statistics"
 */
