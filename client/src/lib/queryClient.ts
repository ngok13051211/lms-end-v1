import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get token from localStorage
  const token = localStorage.getItem("token");
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  console.log(`API Request: ${method} ${url} - Headers:`, headers);
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  
  console.log(`API Response: ${res.status} ${res.statusText}`);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
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
    
    console.log(`Query Request: GET ${url} - Headers:`, headers);
    
    const res = await fetch(url, {
      credentials: "include",
      headers
    });
    
    console.log(`Query Response: ${res.status} ${res.statusText}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
