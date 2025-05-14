import { Request, Response } from "express";
import { swaggerSpec, SwaggerOperation, SwaggerPath } from "../config/swagger";

/**
 * Hiển thị tài liệu OpenAPI dạng JSON
 * @route GET /api/v1/docs.json
 * @access Public
 */
export const getApiDocs = (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
};

/**
 * Hiển thị danh sách endpoints API
 * @route GET /api/v1/endpoints
 * @access Public
 */
export const getApiEndpoints = (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  // Định nghĩa kiểu dữ liệu cho Endpoint
  interface Endpoint {
    method: string;
    path: string;
    description: string;
    tags: string[];
  }

  // Lấy danh sách các paths từ swagger spec
  const paths = Object.keys(swaggerSpec.paths);

  // Tạo mảng các endpoint với phương thức
  const endpoints = paths.reduce<Endpoint[]>((acc, path) => {
    const methods = Object.keys(swaggerSpec.paths[path]).filter(
      (m) => !["parameters"].includes(m)
    );

    methods.forEach((method) => {
      const operation = swaggerSpec.paths[path][
        method as keyof SwaggerPath
      ] as SwaggerOperation;
      const tags = operation?.tags || ["Không phân loại"];

      acc.push({
        method: method.toUpperCase(),
        path: `/api/v1${path}`,
        description: operation?.summary || "Không có mô tả",
        tags,
      });
    });

    return acc;
  }, []);
  // Định nghĩa kiểu dữ liệu cho EndpointSummary
  interface EndpointSummary {
    method: string;
    path: string;
    description: string;
  }

  // Định nghĩa kiểu dữ liệu cho GroupedEndpoints
  interface GroupedEndpoints {
    [tag: string]: EndpointSummary[];
  }

  // Nhóm endpoints theo tags
  const groupedEndpoints = endpoints.reduce<GroupedEndpoints>(
    (acc, endpoint) => {
      endpoint.tags.forEach((tag) => {
        if (!acc[tag]) {
          acc[tag] = [];
        }
        acc[tag].push({
          method: endpoint.method,
          path: endpoint.path,
          description: endpoint.description,
        });
      });
      return acc;
    },
    {}
  );

  return res.success(
    {
      totalEndpoints: endpoints.length,
      docsUrl: `${baseUrl}/api-docs`,
      categories: groupedEndpoints,
    },
    "Danh sách API endpoints"
  );
};
