import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@shared/schema";
import authService from "./authService";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  // Có thể thêm các trường khác ở đây nếu cần
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: false,
  isSuccess: false,
  error: null,
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
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
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
      .addCase(loadUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(loadUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { reset, updateAvatar, updateUserProfile, setUser } =
  authSlice.actions;
export default authSlice.reducer;
