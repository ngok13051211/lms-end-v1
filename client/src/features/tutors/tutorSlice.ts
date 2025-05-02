import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { TutorProfile } from "@shared/schema";
import tutorService from "./tutorService";

interface TutorState {
  profile: TutorProfile | null;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

const initialState: TutorState = {
  profile: null,
  isLoading: false,
  isSuccess: false,
  error: null,
};

// Create or update tutor profile
export const createUpdateTutorProfile = createAsyncThunk(
  "tutor/createUpdateProfile",
  async (profileData: any, thunkAPI) => {
    try {
      return await tutorService.createUpdateProfile(profileData);
    } catch (error: any) {
      const message = error.message || "Something went wrong";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get tutor profile
export const getTutorProfile = createAsyncThunk(
  "tutor/getProfile",
  async (_, thunkAPI) => {
    try {
      return await tutorService.getProfile();
    } catch (error: any) {
      const message = error.message || "Something went wrong";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const tutorSlice = createSlice({
  name: "tutor",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create/Update profile
      .addCase(createUpdateTutorProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        createUpdateTutorProfile.fulfilled,
        (state, action: PayloadAction<TutorProfile>) => {
          state.isLoading = false;
          state.isSuccess = true;
          state.profile = action.payload;
        }
      )
      .addCase(
        createUpdateTutorProfile.rejected,
        (state, action: PayloadAction<any>) => {
          state.isLoading = false;
          state.error = action.payload;
        }
      )
      // Get profile
      .addCase(getTutorProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        getTutorProfile.fulfilled,
        (state, action: PayloadAction<TutorProfile>) => {
          state.isLoading = false;
          state.profile = action.payload;
        }
      )
      .addCase(getTutorProfile.rejected, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { reset } = tutorSlice.actions;
export default tutorSlice.reducer;
