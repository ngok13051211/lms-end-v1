/**
 * @swagger
 * /api/v1/schedules/{tutorId}:
 *   get:
 *     summary: Get tutor's available schedules
 *     description: Returns a tutor's available teaching schedules from the teaching_schedules table with status "available", grouped by date with time slots
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: tutorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the tutor to get schedules for
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Optional course ID to filter schedules by course
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-05-16"
 *         description: Optional start date to filter schedules (YYYY-MM-DD format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-16"
 *         description: Optional end date to filter schedules (YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Successful response with available schedules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the request was successful
 *                 message:
 *                   type: string
 *                   description: Message if no schedules are found
 *                 data:
 *                   type: array
 *                   description: Array of schedule days with date and timeSlots
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         description: Date in YYYY-MM-DD format
 *                         example: "2025-05-16"
 *                       timeSlots:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               description: ID of the teaching schedule record
 *                               example: 123
 *                             startTime:
 *                               type: string
 *                               description: Start time in HH:MM format
 *                               example: "08:00"
 *                             endTime:
 *                               type: string
 *                               description: End time in HH:MM format
 *                               example: "10:00"
 *       400:
 *         description: Bad request, invalid tutor ID
 *       500:
 *         description: Server error
 */
