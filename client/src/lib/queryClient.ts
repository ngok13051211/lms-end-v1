import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let text;
    try {
      text = await res.text();
    } catch (e) {
      text = res.statusText;
    }
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  // Get token from localStorage
  const token = localStorage.getItem("token");
  const headers: HeadersInit = data
    ? { "Content-Type": "application/json" }
    : {};

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // console.log(`API Request: ${method} ${url}`);
  if (data) console.log("Request data:", JSON.stringify(data, null, 2));

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // console.log(`API Response: ${res.status} ${res.statusText}`);

  // Xử lý đặc biệt cho code 401 (Unauthorized)
  if (res.status === 401) {
    console.warn("Authentication failed - token expired or invalid");

    // Xóa token không hợp lệ
    localStorage.removeItem("token");

    // Không tự động chuyển hướng nếu đang ở trang đăng nhập
    if (!window.location.pathname.includes("/login")) {
      console.log("Redirecting to login due to authentication failure");
      window.location.href = "/login";
      throw new Error("Authentication required");
    }
  }

  // Nếu phản hồi không ok, thử đọc chi tiết lỗi
  if (!res.ok) {
    try {
      // Clone response để có thể đọc body
      const errorClone = res.clone();
      const errorText = await errorClone.text();

      try {
        // Thử parse thành JSON
        const errorJson = JSON.parse(errorText);
        const errorMessage =
          errorJson.message || errorJson.error || res.statusText;
        console.error("API Error Response:", errorJson);
        throw new Error(`${res.status}: ${errorMessage}`);
      } catch {
        // Nếu không phải JSON, sử dụng text thô
        console.error("API Error Text:", errorText);
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
    } catch (e) {
      // Fallback nếu không đọc được body
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Bổ sung xử lý lỗi chi tiết hơn trong getQueryFn
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  params?: Record<string, any>;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, params }) =>
  async ({ queryKey }) => {
    // Get token from localStorage
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Build URL with query parameters if provided
    let url = queryKey[0] as string;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    }

    // console.log(`Query Request: GET ${url}`);

    try {
      const res = await fetch(url, {
        credentials: "include",
        headers,
      });

      // console.log(`Query Response: ${res.status} ${res.statusText}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || res.statusText;
        } catch {
          errorMessage = errorText || res.statusText;
        }

        throw new Error(`${res.status}: ${errorMessage}`);
      }

      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
