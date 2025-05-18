import { users as User } from "@shared/schema";

// Register user
const register = async (userData: any): Promise<any> => {
  // Transform camelCase to snake_case for backend compatibility
  const transformedData = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    first_name: userData.firstName,
    last_name: userData.lastName,
    role: userData.role,
  };

  const response = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(transformedData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    // Xử lý thông báo lỗi chi tiết hơn
    if (errorData.error && errorData.error.code === "USER_ALREADY_EXISTS") {
      throw new Error(errorData.message || "Email đã được sử dụng");
    }
    throw new Error(errorData.message || "Registration failed");
  }

  const data = await response.json();

  // In the updated flow, registration doesn't return a token immediately
  // because the user needs to verify their email first
  // Store token in localStorage when registering
  if (data.token) {
    localStorage.setItem("token", data.token);
    // console.log("Token saved after registration:", data.token);
  }

  // We don't automatically send OTP here anymore
  // It will be sent when user reaches the verification page to avoid multiple sends

  return {
    success: data.success,
    message: data.message,
    email: userData.email,
  };
};

const login = async (userData: {
  email: string;
  password: string;
}): Promise<typeof User> => {
  const response = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();

    // Special handling for unverified accounts
    if (
      errorData.error?.message.includes("not verified") ||
      errorData.error?.message.includes("unverified")
    ) {
      throw new Error("Account unverified. Please verify your email address.");
    }

    throw new Error(errorData.error?.message || "Login failed");
  }

  const data = await response.json();
  // console.log("Login response (raw):", data);

  // Xử lý cấu trúc phản hồi từ server
  let user, token;

  // Kiểm tra cấu trúc phản hồi
  if (data.success === true && data.data) {
    // Cấu trúc theo định dạng chuẩn của API:
    // { success: true, data: { user, token }, message: "..." }
    user = data.data.user;
    token = data.data.token;
  } else {
    // Cấu trúc cũ:
    // { user, token }
    user = data.user;
    token = data.token;
  }

  if (!user) {
    console.error("Invalid response format:", data);
    throw new Error("Invalid response format: User data not found");
  }

  // Lưu token
  if (token) {
    localStorage.setItem("token", token);
    // console.log("Token saved:", token);
  } else {
    console.warn("No token received in login response");
  }

  return user;
};

// Load user profile
// const loadUser = async (): Promise<typeof User> => {
//   // Get token from localStorage
//   const token = localStorage.getItem("token");
//   const headers: HeadersInit = {};

//   if (token) {
//     headers["Authorization"] = `Bearer ${token}`;
//   }

//   const response = await fetch("/api/v1/auth/me", {
//     method: "GET",
//     credentials: "include",
//     headers,
//   });

//   if (!response.ok) {
//     throw new Error("Failed to load user profile");
//   }

//   const data = await response.json();
//   return data.user;
// };
const loadUser = async (): Promise<typeof User> => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No authentication token found");
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetch("/api/v1/auth/me", {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      // Nếu token không hợp lệ, xóa nó
      if (response.status === 401) {
        localStorage.removeItem("token");
      }
      throw new Error("Failed to load user profile");
    }

    const data = await response.json();

    // Xử lý cấu trúc phản hồi
    const user = data.data?.user || data.user;

    if (!user) {
      throw new Error("Invalid response format: User data not found");
    }

    return user;
  } catch (error) {
    console.error("Load user error:", error);
    throw error;
  }
};

// Logout user
const logout = async (): Promise<void> => {
  // Remove token from localStorage
  localStorage.removeItem("token");

  await fetch("/api/v1/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  // We'll handle the QueryClient cache clear in the components
};

const authService = {
  register,
  login,
  loadUser,
  logout,
};

export default authService;
