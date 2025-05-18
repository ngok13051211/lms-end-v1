import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import authService from "./authService";

// Định nghĩa type User dựa trên schema users
type User = {
  id: number;
  username: string;
  email: string;
  password?: string; // Không nên lưu password trong state
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  address?: string;
  phone?: string;
  avatar?: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  registrationEmail: string | null;
}

interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  // Có thể thêm các trường khác ở đây nếu cần
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: false,
  isSuccess: false,
  error: null,
  registrationEmail: null,
};

// Register user
export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData: any, thunkAPI) => {
    try {
      return await authService.register(userData);
    } catch (error: any) {
      const message = error.message || "Something went wrong";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  "auth/login",
  async (userData: { email: string; password: string }, thunkAPI) => {
    try {
      return await authService.login(userData);
    } catch (error: any) {
      const message = error.message || "Something went wrong";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Load user profile
export const loadUser = createAsyncThunk(
  "auth/loadUser",
  async (_, thunkAPI) => {
    try {
      return await authService.loadUser();
    } catch (error: any) {
      const message = error.message || "Something went wrong";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Logout user
export const logout = createAsyncThunk("auth/logout", async () => {
  await authService.logout();
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.error = null;
    },
    clearRegistration: (state) => {
      state.registrationEmail = null;
    },
    updateAvatar: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.avatar = action.payload;
      }
    },
    updateUserProfile: (state, action: PayloadAction<ProfileUpdateData>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
      }
    },
    // Action để cập nhật toàn bộ user object
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.isSuccess = true;
        // With the new flow, registration doesn't set the user yet (email needs verification)
        state.registrationEmail = action.payload.email;
      })
      .addCase(registerUser.rejected, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.error = action.payload;
      }) // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Chuyển đổi dữ liệu từ API sang kiểu User
        state.user = action.payload as unknown as User;
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // Chuyển đổi dữ liệu từ API sang kiểu User
        state.user = action.payload as unknown as User;
      })
      .addCase(loadUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.registrationEmail = null;
        state.error = null;
        state.isSuccess = false;
      });
  },
});

export const {
  reset,
  updateAvatar,
  updateUserProfile,
  setUser,
  clearRegistration,
} = authSlice.actions;
export default authSlice.reducer;
