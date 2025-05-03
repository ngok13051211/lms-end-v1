import { User } from "@shared/schema";

// Register user
const register = async (userData: any): Promise<User> => {
  // Transform camelCase to snake_case for backend compatibility
  const transformedData = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    first_name: userData.firstName,
    last_name: userData.lastName,
    role: userData.role
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
    throw new Error(errorData.message || "Registration failed");
  }

  const data = await response.json();
  return data.user;
};

// Login user
const login = async (userData: { email: string; password: string }): Promise<User> => {
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
    throw new Error(errorData.message || "Login failed");
  }

  const data = await response.json();
  return data.user;
};

// Load user profile
const loadUser = async (): Promise<User> => {
  const response = await fetch("/api/v1/auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load user profile");
  }

  const data = await response.json();
  return data.user;
};

// Logout user
const logout = async (): Promise<void> => {
  await fetch("/api/v1/auth/logout", {
    method: "POST",
    credentials: "include",
  });
};

const authService = {
  register,
  login,
  loadUser,
  logout,
};

export default authService;
