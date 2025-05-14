import { Router } from "express";
import * as docsController from "../controllers/docsController";

const router = Router();

/**
 * @swagger
 * /docs.json:
 *   get:
 *     summary: Tải tài liệu OpenAPI dạng JSON
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Tài liệu OpenAPI
 */
router.get("/docs.json", docsController.getApiDocs);

/**
 * @swagger
 * /endpoints:
 *   get:
 *     summary: Hiển thị danh sách tất cả các endpoints API
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Danh sách endpoints API
 */
router.get("/endpoints", docsController.getApiEndpoints);

export default router;
