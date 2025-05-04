import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Edit, Upload, AlertCircle, UserCircle, BadgeCheck, DollarSign, Clock, CalendarDays, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from "date-fns";
import { vi } from 'date-fns/locale';

// Định nghĩa cấu trúc cho khung giờ trống theo ngày trong tuần
const weeklyAvailabilityItemSchema = z.object({
  type: z.literal("weekly"),
  day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  startTime: z.string(), // Format: "HH:MM" in 24h
  endTime: z.string(),   // Format: "HH:MM" in 24h
});

// Định nghĩa cấu trúc cho khung giờ trống theo ngày cụ thể
const specificDateAvailabilityItemSchema = z.object({
  type: z.literal("specific"),
  date: z.string(), // Format: "YYYY-MM-DD"
  startTime: z.string(), // Format: "HH:MM" in 24h
  endTime: z.string(),   // Format: "HH:MM" in 24h
});

// Kết hợp hai loại lịch trống
const availabilityItemSchema = z.discriminatedUnion("type", [
  weeklyAvailabilityItemSchema,
  specificDateAvailabilityItemSchema
]);

// Định nghĩa kiểu dữ liệu cho một khung giờ trống
export type AvailabilityItem = z.infer<typeof availabilityItemSchema>;
export type WeeklyAvailabilityItem = z.infer<typeof weeklyAvailabilityItemSchema>;
export type SpecificDateAvailabilityItem = z.infer<typeof specificDateAvailabilityItemSchema>;

// Form schema for tutor profile
const tutorProfileSchema = z.object({
  bio: z.string().min(50, "Bio must be at least 50 characters"),
  education: z.string().min(20, "Education must be at least 20 characters"),
  experience: z.string().min(20, "Experience must be at least 20 characters"),
  hourlyRate: z.coerce.number()
    .min(10000, "Hourly rate must be at least 10,000 VND")
    .max(99999999, "Hourly rate must be less than 100,000,000 VND"),
  teachingMode: z.enum(["online", "offline", "both"]),
  // Trường availability là tùy chọn, sẽ được xử lý riêng
});

// Hàm ánh xạ tên ngày sang số thứ tự ngày trong tuần
const getDayOfWeekNumber = (day: string): number => {
  const dayMap: {[key: string]: number} = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };
  return dayMap[day.toLowerCase()];
};

// Hàm tiện ích để lấy ngày trong tuần tới dựa trên tên ngày trong tuần
const getNextWeekdayDate = (weekday: string): Date => {
  const dayNumber = getDayOfWeekNumber(weekday);
  if (dayNumber === undefined) return new Date(); // Trả về ngày hiện tại nếu không tìm thấy
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysUntilNext = (dayNumber + 7 - today.getDay()) % 7;
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext));
  
  return nextDate;
};

// Hàm chuyển đổi tên ngày trong tuần tiếng Anh sang tiếng Việt và thêm ngày/tháng/năm
const formatWeekdayWithDate = (weekday: string): string => {
  const date = getNextWeekdayDate(weekday);
  const weekdayName = {
    "monday": "Thứ Hai",
    "tuesday": "Thứ Ba",
    "wednesday": "Thứ Tư",
    "thursday": "Thứ Năm",
    "friday": "Thứ Sáu",
    "saturday": "Thứ Bảy",
    "sunday": "Chủ Nhật"
  }[weekday] || weekday;
  
  // Format: Thứ Hai (06/05/2025)
  return `${weekdayName} (${format(date, 'dd/MM/yyyy', { locale: vi })})`;
};

export default function TutorDashboardProfile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [certifications, setCertifications] = useState<File[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCertifications, setUploadingCertifications] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  // Khung giờ trống
  const [availabilityItems, setAvailabilityItems] = useState<AvailabilityItem[]>([]);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  
  // State để quản lý một khung giờ mới
  const [newAvailabilityItem, setNewAvailabilityItem] = useState<WeeklyAvailabilityItem>({
    type: "weekly",
    day: "monday",
    startTime: "08:00",
    endTime: "17:00"
  });
  
  // State để quản lý loại lịch trống đang tạo (hàng tuần hoặc ngày cụ thể)
  const [availabilityType, setAvailabilityType] = useState<"weekly" | "specific">("weekly");
  
  // State cho khung giờ trống theo ngày cụ thể
  const [newSpecificDateItem, setNewSpecificDateItem] = useState<SpecificDateAvailabilityItem>({
    type: "specific",
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: "08:00",
    endTime: "17:00"
  });
  
  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading, error: profileError, refetch: refetchTutorProfile } = useQuery<any>({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false, // Don't retry on error
    staleTime: 0, // Always revalidate to ensure fresh data
    refetchInterval: 1000, // Poll every second while the component is mounted
  });

  // Get subjects and education levels for profile editing
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: [`/api/v1/subjects`],
    enabled: true, // Always fetch subjects for profile creation
  });
  
  const { data: educationLevels = [] } = useQuery<any[]>({
    queryKey: [`/api/v1/education-levels`],
    enabled: true, // Always fetch education levels for profile creation
  });

  // Tutor profile form
  const profileForm = useForm<z.infer<typeof tutorProfileSchema>>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      bio: "",
      education: "",
      experience: "",
      hourlyRate: 10000,
      teachingMode: "online",
    },
  });
  
  // Update form values when profile data changes
  useEffect(() => {
    if (tutorProfile) {
      console.log("Received tutorProfile data:", JSON.stringify(tutorProfile));
      
      // Manually extract and convert values with appropriate defaults
      const formData = {
        bio: tutorProfile.bio || "",
        education: tutorProfile.education || "",
        experience: tutorProfile.experience || "",
        hourlyRate: tutorProfile.hourly_rate ? Number(tutorProfile.hourly_rate) : 10000,
        teachingMode: tutorProfile.teaching_mode ? 
          (tutorProfile.teaching_mode as "online" | "offline" | "both") : "online",
      };
      
      console.log("Setting form values:", JSON.stringify(formData));
      profileForm.reset(formData);
    } else {
      profileForm.reset({
        bio: "",
        education: "",
        experience: "",
        hourlyRate: 10000,
        teachingMode: "online",
      });
    }
  }, [tutorProfile, profileForm.reset]);

  // Create/Update tutor profile
  const profileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tutorProfileSchema>) => {
      const method = tutorProfile ? "PATCH" : "POST";
      
      // Limit hourly_rate to avoid numeric overflow (PostgreSQL decimal precision limit)
      const hourlyRate = data.hourlyRate > 99999999 ? 99999999 : data.hourlyRate;
      
      // Ensure teaching_mode is explicitly set (don't rely on serverside defaults)
      const teachingMode = data.teachingMode || "online";
      
      // Build request data with snake_case field names for the API
      // Make sure experience_years is included as numeric value or undefined
      const completeData = {
        bio: data.bio,
        education: data.education,
        experience: data.experience,
        experience_years: tutorProfile?.experience_years || undefined,
        hourly_rate: hourlyRate,
        teaching_mode: teachingMode,
        subject_ids: selectedSubjects,
        level_ids: selectedLevels
      };
      
      console.log("Sending data to API:", JSON.stringify(completeData));
      
      // Add extra logging for debugging
      console.log("Request method:", method);
      console.log("Request URL:", `/api/v1/tutors/profile`);
      
      try {
        const res = await apiRequest(method, `/api/v1/tutors/profile`, completeData);
        const responseData = await res.json();
        console.log("API response:", JSON.stringify(responseData));
        
        // Lưu dữ liệu cập nhật để sử dụng sau khi mutation thành công
        const updatedData = {
          bio: data.bio,
          education: data.education,
          experience: data.experience,
          hourlyRate: hourlyRate,
          teachingMode: teachingMode,
          subjects: selectedSubjects,
          levels: selectedLevels
        };
        
        // Trả về cả responseData và updatedData
        return {
          responseData,
          updatedData
        };
      } catch (error) {
        console.error("API call error:", error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("Profile updated successfully:", result.responseData);
      toast({
        title: "Profile updated successfully",
        description: "Your profile has been updated.",
        variant: "default",
      });
      
      // Thay đổi: Trước tiên, cập nhật form với dữ liệu mới từ form đã submit
      const updatedFormData = {
        bio: result.updatedData.bio,
        education: result.updatedData.education,
        experience: result.updatedData.experience,
        hourlyRate: result.updatedData.hourlyRate,
        teachingMode: result.updatedData.teachingMode as "online" | "offline" | "both",
      };
      
      console.log("Updating form with submitted data:", updatedFormData);
      profileForm.reset(updatedFormData);
      
      // Cập nhật selected subjects và levels
      setSelectedSubjects(result.updatedData.subjects);
      setSelectedLevels(result.updatedData.levels);
      
      // Sau đó refetch profile để đảm bảo dữ liệu mới nhất từ server
      refetchTutorProfile().then(() => {
        console.log("Profile refetched successfully");
        setProfileDialogOpen(false);
      });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Update avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      
      console.log("Uploading avatar file:", file.name, "size:", file.size);
      
      const res = await fetch("/api/v1/users/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
        // Do not set Content-Type header, browser will automatically set it with the boundary
      });
      
      // Log response for debugging
      console.log("Avatar upload response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response body:", errorText);
        throw new Error(`Upload failed with status: ${res.status}. ${errorText}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both user data and tutor profile to ensure all avatar instances get updated
      queryClient.invalidateQueries({ queryKey: [`/api/v1/auth/me`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      
      toast({
        title: "Avatar updated",
        description: "Your profile photo has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Upload certifications
  const uploadCertificationsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("documents", file);
      });
      
      // Add console logging for debugging
      console.log("Uploading certifications, files count:", files.length);
      
      // Lấy token từ localStorage nếu có
      const token = localStorage.getItem('token');
      
      const res = await fetch("/api/v1/tutors/certifications", {
        method: "POST",
        credentials: "include",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      
      // Log response status for debugging
      console.log("Certification upload response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Certification upload error response:", errorText);
        throw new Error(`Upload failed with status: ${res.status}. ${errorText}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      
      toast({
        title: "Certifications uploaded",
        description: "Your certification documents have been uploaded successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Certifications upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload certification documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Selected file:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      // Validate file size (under 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `The image must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
          variant: "destructive",
        });
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, GIF, or WebP).",
          variant: "destructive",
        });
        return;
      }
      
      setAvatar(file);
      toast({
        title: "File selected",
        description: `${file.name} (${(file.size / 1024).toFixed(2)}KB) ready to upload. Click Apply to upload.`,
        variant: "default",
      });
    }
  };
  
  const handleCertificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      
      // Log selected files
      console.log("Selected certification files:", fileArray.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      })));
      
      // Validate file sizes (each under 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      const oversizedFiles = fileArray.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        toast({
          title: "Files too large",
          description: `${oversizedFiles.length} file(s) exceed the 5MB size limit.`,
          variant: "destructive",
        });
        return;
      }
      
      // Validate file types
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      const invalidFiles = fileArray.filter(file => !validTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid file type(s)",
          description: "Please select only image files (JPEG, PNG) or PDF documents.",
          variant: "destructive",
        });
        return;
      }
      
      setCertifications(fileArray);
      toast({
        title: "Files selected",
        description: `${fileArray.length} file(s) ready to upload. Click Upload to continue.`,
        variant: "default",
      });
    }
  };

  const handleAvatarUpload = async () => {
    if (avatar) {
      setUploadingAvatar(true);
      try {
        await uploadAvatarMutation.mutateAsync(avatar);
        setAvatar(null);
      } catch (error) {
        console.error("Avatar upload error:", error);
        // Display error toast even if the mutation error handler doesn't catch it
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to upload profile photo. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploadingAvatar(false);
      }
    }
  };
  
  const handleCertificationsUpload = async () => {
    if (certifications.length > 0) {
      setUploadingCertifications(true);
      try {
        await uploadCertificationsMutation.mutateAsync(certifications);
        setCertifications([]);
      } catch (error) {
        console.error("Certifications upload error:", error);
        // Display error toast even if the mutation error handler doesn't catch it
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to upload certification documents. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploadingCertifications(false);
      }
    }
  };

  const { toast } = useToast();

  const onSubmitProfile = async (data: z.infer<typeof tutorProfileSchema>) => {
    try {
      console.log("Submitting profile data:", data);
      const response = await profileMutation.mutateAsync(data);
      console.log("Profile update response:", response);
      
      // Show success toast notification
      toast({
        title: "Profile updated",
        description: "Your tutor profile has been updated successfully.",
        variant: "default",
      });
      
      // Manually add a slight delay before refetching to ensure DB has updated
      setTimeout(() => {
        refetchTutorProfile().then(result => {
          console.log("Manual refetch result:", result);
          
          // Update form with the latest data after db changes
          if (result.data) {
            const formData = {
              bio: result.data.bio || "",
              education: result.data.education || "",
              experience: result.data.experience || "",
              hourlyRate: result.data.hourly_rate ? Number(result.data.hourly_rate) : 10000,
              teachingMode: result.data.teaching_mode ? 
                (result.data.teaching_mode as "online" | "offline" | "both") : "online",
            };
            
            console.log("Forcing form update with data:", formData);
            profileForm.reset(formData);
            
            // Also force update the selected subjects and levels
            if (result.data.subjects) {
              setSelectedSubjects(result.data.subjects.map((s: any) => s.id.toString()));
            }
            
            if (result.data.levels) {
              setSelectedLevels(result.data.levels.map((l: any) => l.id.toString()));
            }
          }
        });
      }, 500);
    } catch (error) {
      console.error("Profile update error:", error);
      
      // Show error toast notification
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Initialize the selected subjects and levels when profile is loaded
  useEffect(() => {
    if (tutorProfile) {
      if (tutorProfile.subjects) {
        setSelectedSubjects(tutorProfile.subjects.map((s: any) => s.id.toString()));
      } else {
        setSelectedSubjects([]);
      }
      
      if (tutorProfile.levels) {
        setSelectedLevels(tutorProfile.levels.map((l: any) => l.id.toString()));
      } else {
        setSelectedLevels([]);
      }
      
      // Cập nhật lịch trống từ dữ liệu tutorProfile
      if (tutorProfile.availability) {
        try {
          let parsedAvailability;
          
          // Hỗ trợ cả chuỗi JSON và mảng đã parse
          if (typeof tutorProfile.availability === 'string') {
            parsedAvailability = JSON.parse(tutorProfile.availability);
          } else if (Array.isArray(tutorProfile.availability)) {
            parsedAvailability = tutorProfile.availability;
          } else {
            console.warn("Dữ liệu lịch trống không đúng định dạng:", tutorProfile.availability);
            parsedAvailability = [];
          }
          
          // Đảm bảo dữ liệu đúng định dạng
          if (Array.isArray(parsedAvailability)) {
            const convertedItems: AvailabilityItem[] = [];
            
            // Xử lý dữ liệu lịch trống cũ (không có trường type)
            for (const item of parsedAvailability) {
              // Nếu đã có trường type, giữ nguyên
              if (item.type === "weekly" || item.type === "specific") {
                // Chỉ cần chuẩn hóa thời gian
                const newItem = { ...item };
                
                // Chuẩn hóa thời gian bắt đầu
                if (newItem.startTime && newItem.startTime.length === 4) {
                  newItem.startTime = "0" + newItem.startTime;
                }
                
                // Chuẩn hóa thời gian kết thúc
                if (newItem.endTime && newItem.endTime.length === 4) {
                  newItem.endTime = "0" + newItem.endTime;
                }
                
                convertedItems.push(newItem as AvailabilityItem);
                continue;
              }
              
              // Đối với data cũ không có type, nếu có day thì chuyển thành weekly
              if (item.day) {
                const day = item.day.toLowerCase() as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
                
                // Chuẩn hóa thời gian bắt đầu
                let startTime = item.startTime || "08:00";
                if (startTime.length === 4) {
                  startTime = "0" + startTime;
                }
                
                // Chuẩn hóa thời gian kết thúc
                let endTime = item.endTime || "17:00";
                if (endTime.length === 4) {
                  endTime = "0" + endTime;
                }
                
                convertedItems.push({
                  type: "weekly",
                  day,
                  startTime,
                  endTime
                });
              }
              // Nếu có date thì chuyển thành specific
              else if (item.date) {
                convertedItems.push({
                  type: "specific",
                  date: item.date,
                  startTime: item.startTime || "08:00",
                  endTime: item.endTime || "17:00"
                });
              }
              else {
                console.warn("Item lịch trống không đúng định dạng:", item);
              }
            }
            
            console.log("Dữ liệu lịch trống đã chuyển đổi:", convertedItems);
            setAvailabilityItems(convertedItems);
          } else {
            console.warn("Dữ liệu lịch trống không phải mảng:", parsedAvailability);
            setAvailabilityItems([]);
          }
        } catch (error) {
          console.error("Lỗi khi parse availability:", error);
          setAvailabilityItems([]);
        }
      } else {
        setAvailabilityItems([]);
      }
    } else {
      // Clear selections when no profile exists
      setSelectedSubjects([]);
      setSelectedLevels([]);
      setAvailabilityItems([]);
    }
  }, [tutorProfile]);
  
  // Hàm xử lý cập nhật lịch trống
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (availabilityData: AvailabilityItem[]) => {
      // Sử dụng kiểu AvailabilityItem mới với discriminated union
      // Tuy nhiên vẫn chuẩn hóa để tương thích với backend cũ
      const normalizedData = availabilityData.map(item => {
        if (item.type === "weekly") {
          // Weekly availability - compatibile with old format
          const day = item.day.toLowerCase() as "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
          
          // Chuẩn hóa thời gian
          let startTime = item.startTime;
          if (startTime.length === 4) { // Nếu là H:MM
            startTime = "0" + startTime;
          }
          
          let endTime = item.endTime;
          if (endTime.length === 4) { // Nếu là H:MM
            endTime = "0" + endTime;
          }
          
          // Convert to old data format for backward compatibility
          return {
            day: day,
            startTime: startTime,
            endTime: endTime
          };
        } 
        else if (item.type === "specific") {
          // For specific date, we convert to standardized format that backend can understand
          // Hiện tại backend chưa hỗ trợ ngày cụ thể, nên chuyển ngày sang ngày trong tuần
          const specificDate = new Date(item.date);
          let day: string;
          
          // Lấy ngày trong tuần từ date
          switch (specificDate.getDay()) {
            case 0: day = "sunday"; break;
            case 1: day = "monday"; break;
            case 2: day = "tuesday"; break;
            case 3: day = "wednesday"; break;
            case 4: day = "thursday"; break;
            case 5: day = "friday"; break;
            case 6: day = "saturday"; break;
            default: day = "monday";
          }
          
          // Chuẩn hóa thời gian
          let startTime = item.startTime;
          if (startTime.length === 4) { // Nếu là H:MM
            startTime = "0" + startTime;
          }
          
          let endTime = item.endTime;
          if (endTime.length === 4) { // Nếu là H:MM
            endTime = "0" + endTime;
          }
          
          // Lưu thông tin ngày cụ thể vào metadata
          return {
            day,
            startTime,
            endTime,
            specificDate: item.date // Metadata cho phía client
          };
        }
        else {
          console.warn("Không nhận ra loại lịch trống:", item);
          return null;
        }
      }).filter(Boolean); // Remove any null values
      
      // Chuyển danh sách availability thành chuỗi JSON
      const availabilityJson = JSON.stringify(normalizedData);
      
      console.log("Cập nhật lịch trống:", availabilityJson);
      
      const res = await apiRequest("PATCH", `/api/v1/tutors/profile`, {
        availability: availabilityJson
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      setAvailabilityDialogOpen(false);
      
      toast({
        title: "Cập nhật thành công",
        description: "Lịch trống của bạn đã được cập nhật.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Cập nhật thất bại",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật lịch trống.",
        variant: "destructive",
      });
    }
  });
  
  // Thêm mới một khung giờ trống
  // Hàm kiểm tra xem một khung giờ mới có bị trùng với bất kỳ khung giờ nào đã tồn tại hay không
  const isTimeSlotOverlapping = (newSlot: AvailabilityItem) => {
    return availabilityItems.some(existingSlot => {
      // Chỉ kiểm tra trùng lặp nếu cùng ngày trong tuần
      if (existingSlot.day === newSlot.day) {
        // Chuyển đổi giờ:phút thành số phút để dễ so sánh
        const [existingStartHour, existingStartMin] = existingSlot.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = existingSlot.endTime.split(':').map(Number);
        const [newStartHour, newStartMin] = newSlot.startTime.split(':').map(Number);
        const [newEndHour, newEndMin] = newSlot.endTime.split(':').map(Number);
        
        const existingStartMinutes = existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;
        const newStartMinutes = newStartHour * 60 + newStartMin;
        const newEndMinutes = newEndHour * 60 + newEndMin;
        
        // Kiểm tra xem hai khoảng thời gian có giao nhau không
        // Nếu thời gian bắt đầu mới nhỏ hơn thời gian kết thúc hiện tại
        // VÀ thời gian kết thúc mới lớn hơn thời gian bắt đầu hiện tại
        // thì hai khoảng thời gian giao nhau
        return (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes);
      }
      return false;
    });
  };

  // Kiểm tra thời gian (cả hàng tuần và ngày cụ thể)
  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  };
  
  // Thêm lịch trống hàng tuần
  const handleAddWeeklyAvailability = () => {
    // Kiểm tra nếu thời gian kết thúc <= thời gian bắt đầu
    if (!validateTimeRange(newAvailabilityItem.startTime, newAvailabilityItem.endTime)) {
      toast({
        title: "Lỗi thời gian",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }
    
    // Kiểm tra trùng lặp (chỉ đối với weekly, specific sẽ kiểm tra riêng)
    // Phải update isTimeSlotOverlapping để hỗ trợ kiểu mới
    const weeklyItems = availabilityItems.filter(item => item.type === "weekly") as WeeklyAvailabilityItem[];
    const isOverlapping = weeklyItems.some(existingSlot => {
      if (existingSlot.day === newAvailabilityItem.day) {
        const [existingStartHour, existingStartMin] = existingSlot.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = existingSlot.endTime.split(':').map(Number);
        const [newStartHour, newStartMin] = newAvailabilityItem.startTime.split(':').map(Number);
        const [newEndHour, newEndMin] = newAvailabilityItem.endTime.split(':').map(Number);
        
        const existingStartMinutes = existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;
        const newStartMinutes = newStartHour * 60 + newStartMin;
        const newEndMinutes = newEndHour * 60 + newEndMin;
        
        return (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes);
      }
      return false;
    });
    
    if (isOverlapping) {
      toast({
        title: "Lịch trùng lặp",
        description: "Khung giờ này trùng với một khung giờ đã tồn tại. Vui lòng chọn thời gian khác.",
        variant: "destructive",
      });
      return;
    }
    
    // Nếu không có vấn đề gì, thêm khung giờ mới
    setAvailabilityItems([...availabilityItems, { ...newAvailabilityItem }]);
    
    // Reset form
    setNewAvailabilityItem({
      type: "weekly",
      day: "monday",
      startTime: "08:00",
      endTime: "17:00"
    });
  };
  
  // Thêm lịch trống ngày cụ thể
  const handleAddSpecificDateAvailability = () => {
    // Kiểm tra nếu thời gian kết thúc <= thời gian bắt đầu
    if (!validateTimeRange(newSpecificDateItem.startTime, newSpecificDateItem.endTime)) {
      toast({
        title: "Lỗi thời gian",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }
    
    // Kiểm tra xem đã có lịch trống cho ngày này chưa
    const specificItems = availabilityItems.filter(item => 
      item.type === "specific") as SpecificDateAvailabilityItem[];
    
    const isOverlapping = specificItems.some(existingSlot => {
      if (existingSlot.date === newSpecificDateItem.date) {
        const [existingStartHour, existingStartMin] = existingSlot.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = existingSlot.endTime.split(':').map(Number);
        const [newStartHour, newStartMin] = newSpecificDateItem.startTime.split(':').map(Number);
        const [newEndHour, newEndMin] = newSpecificDateItem.endTime.split(':').map(Number);
        
        const existingStartMinutes = existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;
        const newStartMinutes = newStartHour * 60 + newStartMin;
        const newEndMinutes = newEndHour * 60 + newEndMin;
        
        return (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes);
      }
      return false;
    });
    
    if (isOverlapping) {
      toast({
        title: "Lịch trùng lặp",
        description: "Đã có lịch cho ngày này trong cùng khung giờ. Vui lòng chọn thời gian khác.",
        variant: "destructive",
      });
      return;
    }
    
    // Nếu không có vấn đề gì, thêm khung giờ mới
    setAvailabilityItems([...availabilityItems, { ...newSpecificDateItem }]);
    
    // Reset form nhưng giữ lại date (ngày mai)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setNewSpecificDateItem({
      type: "specific",
      date: format(tomorrow, 'yyyy-MM-dd'),
      startTime: "08:00",
      endTime: "17:00"
    });
  };
  
  // Hàm xử lý thêm lịch trống dựa trên loại lịch đang được chọn
  const handleAddAvailability = () => {
    if (availabilityType === "weekly") {
      handleAddWeeklyAvailability();
    } else {
      handleAddSpecificDateAvailability();
    }
  };
  
  // Xóa một khung giờ trống
  const handleRemoveAvailability = (index: number) => {
    const newItems = [...availabilityItems];
    newItems.splice(index, 1);
    setAvailabilityItems(newItems);
  };
  
  // Xóa lịch trùng lặp trước khi lưu
  const removeDuplicateTimeSlots = (slots: AvailabilityItem[]): AvailabilityItem[] => {
    // Sử dụng Map để lọc các khung giờ trùng lặp theo ngày
    const dayMaps: Record<string, AvailabilityItem[]> = {};
    
    // Nhóm các khung giờ theo ngày
    slots.forEach(slot => {
      if (!dayMaps[slot.day]) {
        dayMaps[slot.day] = [];
      }
      dayMaps[slot.day].push(slot);
    });
    
    // Kết quả cuối cùng
    const result: AvailabilityItem[] = [];
    
    // Xử lý cho từng ngày
    Object.entries(dayMaps).forEach(([day, daySlots]) => {
      // Sắp xếp các slot theo thời gian bắt đầu
      daySlots.sort((a, b) => {
        const [aHour, aMin] = a.startTime.split(':').map(Number);
        const [bHour, bMin] = b.startTime.split(':').map(Number);
        
        const aMinutes = aHour * 60 + aMin;
        const bMinutes = bHour * 60 + bMin;
        
        return aMinutes - bMinutes;
      });
      
      // Kết hợp các khung giờ chồng lấp
      const mergedSlots: AvailabilityItem[] = [];
      
      for (const slot of daySlots) {
        if (mergedSlots.length === 0) {
          mergedSlots.push(slot);
          continue;
        }
        
        const lastSlot = mergedSlots[mergedSlots.length - 1];
        
        // Chuyển đổi giờ:phút thành số phút
        const [lastStartHour, lastStartMin] = lastSlot.startTime.split(':').map(Number);
        const [lastEndHour, lastEndMin] = lastSlot.endTime.split(':').map(Number);
        const [currStartHour, currStartMin] = slot.startTime.split(':').map(Number);
        const [currEndHour, currEndMin] = slot.endTime.split(':').map(Number);
        
        const lastStartMinutes = lastStartHour * 60 + lastStartMin;
        const lastEndMinutes = lastEndHour * 60 + lastEndMin;
        const currStartMinutes = currStartHour * 60 + currStartMin;
        const currEndMinutes = currEndHour * 60 + currEndMin;
        
        // Nếu khung giờ hiện tại chồng lấp với khung giờ trước đó, hợp nhất chúng
        if (currStartMinutes <= lastEndMinutes) {
          // Cập nhật thời gian kết thúc của khung giờ cuối nếu cần
          if (currEndMinutes > lastEndMinutes) {
            // Chuyển số phút thành giờ:phút
            const newEndHour = Math.floor(currEndMinutes / 60);
            const newEndMin = currEndMinutes % 60;
            lastSlot.endTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
          }
        } else {
          // Nếu không chồng lấp, thêm khung giờ mới
          mergedSlots.push(slot);
        }
      }
      
      // Thêm các khung giờ đã hợp nhất vào kết quả
      result.push(...mergedSlots);
    });
    
    return result;
  };

  // Cập nhật thông tin lịch trống
  const handleSubmitAvailability = () => {
    // Loại bỏ các lịch trùng lặp trước khi gửi lên server
    const cleanedAvailabilityItems = removeDuplicateTimeSlots(availabilityItems);
    
    // Cập nhật state để người dùng biết lịch đã được dọn dẹp
    if (JSON.stringify(cleanedAvailabilityItems) !== JSON.stringify(availabilityItems)) {
      setAvailabilityItems(cleanedAvailabilityItems);
      toast({
        title: "Đã tối ưu hóa lịch trống",
        description: "Hệ thống đã tự động loại bỏ các khung giờ trùng lặp.",
        variant: "default",
      });
    }
    
    // Gửi dữ liệu đã được dọn dẹp lên server
    updateAvailabilityMutation.mutate(cleanedAvailabilityItems);
  };

  if (profileLoading) {
    return (
      <TutorDashboardLayout activePage="profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading profile...</span>
        </div>
      </TutorDashboardLayout>
    );
  }

  return (
    <TutorDashboardLayout activePage="profile">
      <div className="grid grid-cols-1 gap-6">
        {/* Profile Overview Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Hồ sơ Gia sư</CardTitle>
            <CardDescription>
              Thông tin hồ sơ và cài đặt tài khoản của bạn
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage src={user?.avatar || undefined} alt={user?.first_name || "User"} />
                  <AvatarFallback className="text-2xl">
                    {(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col items-center">
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center mb-2 text-primary hover:text-primary/80">
                      <Upload className="h-4 w-4 mr-1" />
                      <span>Upload avatar</span>
                    </div>
                    <input
                      id="avatar-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                  
                  {avatar && (
                    <Button 
                      size="sm" 
                      onClick={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h2 className="text-xl font-medium">
                      {user?.first_name} {user?.last_name}
                    </h2>
                    <p className="text-muted-foreground">{user?.email}</p>
                    
                    <div className="flex items-center mt-2">
                      <Badge variant={tutorProfile?.isVerified ? "default" : "outline"} className="mr-2">
                        {tutorProfile?.isVerified ? "Verified" : "Pending Verification"}
                      </Badge>
                      {tutorProfile?.rating && (
                        <Badge variant="outline" className="bg-yellow-50">
                          ★ {typeof tutorProfile.rating === 'number' 
                              ? tutorProfile.rating.toFixed(1) 
                              : tutorProfile.rating} ({tutorProfile.totalReviews || 0})
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setProfileDialogOpen(true)}
                    className="mt-4 md:mt-0"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {tutorProfile ? "Edit Profile" : "Create Profile"}
                  </Button>
                </div>
                
                {tutorProfile ? (
                  <>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-2">Môn học</h3>
                        <div className="flex flex-wrap gap-2">
                          {tutorProfile.subjects?.map((subject: any) => (
                            <Badge key={subject.id} variant="outline">
                              {subject.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Cấp độ giảng dạy</h3>
                        <div className="flex flex-wrap gap-2">
                          {tutorProfile.levels?.map((level: any) => (
                            <Badge key={level.id} variant="outline">
                              {level.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Mức phí tham khảo</h3>
                      <p className="flex items-center">
                        <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
                        {typeof tutorProfile.hourly_rate === 'number' 
                          ? new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND' 
                            }).format(tutorProfile.hourly_rate)
                          : new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND' 
                            }).format(Number(tutorProfile.hourly_rate))
                        }
                        <span className="text-sm text-muted-foreground ml-1">/giờ</span>
                      </p>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Hình thức dạy</h3>
                      <Badge>
                        {tutorProfile.teaching_mode 
                          ? {
                              online: "Trực tuyến",
                              offline: "Tại chỗ",
                              both: "Cả hai"
                            }[tutorProfile.teaching_mode as 'online' | 'offline' | 'both'] || "Không xác định"
                          : "Không xác định"
                        }
                      </Badge>
                    </div>
                  </>
                ) : (
                  <Alert className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Profile Not Created</AlertTitle>
                    <AlertDescription>
                      You haven't created your tutor profile yet. Create your profile to start receiving inquiries from students.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Profile Details */}
        {tutorProfile && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Giới thiệu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line">
                    {tutorProfile.bio}
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Học vấn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-line">
                      {tutorProfile.education}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Kinh nghiệm</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-line">
                      {tutorProfile.experience}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Lịch trống Section */}
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lịch trống</CardTitle>
                  <CardDescription>
                    Thiết lập thời gian bạn có thể dạy trong tuần
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setAvailabilityDialogOpen(true)}
                  variant="outline"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Cập nhật lịch trống
                </Button>
              </CardHeader>
              <CardContent>
                {availabilityItems.length > 0 ? (
                  <div className="space-y-4">
                    {/* Lịch hàng tuần */}
                    {availabilityItems.some(item => item.type === 'weekly') && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">Lịch hàng tuần</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {availabilityItems
                            .filter(item => item.type === 'weekly')
                            .map((item, index) => {
                              const weeklyItem = item as WeeklyAvailabilityItem;
                              // Lấy ngày tương ứng để hiển thị minh họa
                              const weekdayDate = getNextWeekdayDate(weeklyItem.day);
                              const formattedDate = format(weekdayDate, 'dd/MM/yyyy', { locale: vi });
                              
                              // Hiển thị tên ngày trong tuần kèm ngày/tháng/năm minh họa
                              let dayName = '';
                              switch(weeklyItem.day) {
                                case 'monday': dayName = 'Thứ Hai'; break;
                                case 'tuesday': dayName = 'Thứ Ba'; break;
                                case 'wednesday': dayName = 'Thứ Tư'; break;
                                case 'thursday': dayName = 'Thứ Năm'; break;
                                case 'friday': dayName = 'Thứ Sáu'; break;
                                case 'saturday': dayName = 'Thứ Bảy'; break;
                                case 'sunday': dayName = 'Chủ Nhật'; break;
                                default: dayName = weeklyItem.day;
                              }
                              
                              return (
                                <div key={`weekly-${index}`} className="border rounded-md p-4 flex flex-col">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                                      Hàng tuần
                                    </Badge>
                                  </div>
                                  <div className="font-medium mb-2">
                                    {dayName}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                      (Ví dụ: {formattedDate})
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">{weeklyItem.startTime} - {weeklyItem.endTime}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    
                    {/* Lịch ngày cụ thể */}
                    {availabilityItems.some(item => item.type === 'specific') && (
                      <div className="mt-6">
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">Lịch theo ngày cụ thể</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {availabilityItems
                            .filter(item => item.type === 'specific')
                            .map((item, index) => {
                              const specificItem = item as SpecificDateAvailabilityItem;
                              const specificDate = new Date(specificItem.date);
                              const formattedDate = format(specificDate, 'dd/MM/yyyy', { locale: vi });
                              const dayName = format(specificDate, 'EEEE', { locale: vi });
                              
                              // Kiểm tra ngày đã qua chưa
                              const isPastDate = specificDate < new Date();
                              
                              return (
                                <div 
                                  key={`specific-${index}`} 
                                  className={`border rounded-md p-4 flex flex-col ${isPastDate ? 'opacity-50' : ''}`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                                      Ngày cụ thể
                                    </Badge>
                                    {isPastDate && (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">
                                        Đã qua
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="font-medium mb-2">
                                    {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                      ({formattedDate})
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">{specificItem.startTime} - {specificItem.endTime}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    
                    {/* Hỗ trợ dữ liệu cũ (không có type) */}
                    {availabilityItems.some(item => !item.type) && (
                      <div className="mt-6">
                        <h3 className="font-medium text-sm text-muted-foreground mb-2">Lịch trống khác</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {availabilityItems
                            .filter(item => !item.type && 'day' in item)
                            .map((item: any, index) => {
                              // Lấy ngày tương ứng để hiển thị minh họa
                              const weekdayDate = getNextWeekdayDate(item.day);
                              const formattedDate = format(weekdayDate, 'dd/MM/yyyy', { locale: vi });
                              
                              // Hiển thị tên ngày trong tuần kèm ngày/tháng/năm minh họa
                              let dayName = '';
                              switch(item.day) {
                                case 'monday': dayName = 'Thứ Hai'; break;
                                case 'tuesday': dayName = 'Thứ Ba'; break;
                                case 'wednesday': dayName = 'Thứ Tư'; break;
                                case 'thursday': dayName = 'Thứ Năm'; break;
                                case 'friday': dayName = 'Thứ Sáu'; break;
                                case 'saturday': dayName = 'Thứ Bảy'; break;
                                case 'sunday': dayName = 'Chủ Nhật'; break;
                                default: dayName = item.day;
                              }
                              
                              return (
                                <div key={`legacy-${index}`} className="border rounded-md p-4 flex flex-col">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200">
                                      Định dạng cũ
                                    </Badge>
                                  </div>
                                  <div className="font-medium mb-2">
                                    {dayName}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                      (Ví dụ: {formattedDate})
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">{item.startTime} - {item.endTime}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed rounded-md">
                    <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      Bạn chưa thiết lập lịch trống. Học viên sẽ không biết khi nào bạn có thể dạy.
                    </p>
                    <Button 
                      onClick={() => setAvailabilityDialogOpen(true)}
                      className="mt-4"
                      variant="outline"
                    >
                      Thiết lập lịch trống
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Certification Upload Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Chứng chỉ & Bằng cấp</CardTitle>
                <CardDescription>
                  Tải lên các chứng chỉ và bằng cấp để xác minh trình độ chuyên môn của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tutorProfile?.certifications ? (
                    <div className="mb-4">
                      <p>Chứng chỉ đã tải lên:</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {(() => {
                          try {
                            const certUrls = Array.isArray(tutorProfile.certifications) 
                              ? tutorProfile.certifications 
                              : JSON.parse(tutorProfile.certifications);
                            
                            return Array.isArray(certUrls) ? certUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block border rounded-md overflow-hidden hover:shadow-md transition-shadow"
                                >
                                  {url.toLowerCase().endsWith('.pdf') ? (
                                    <div className="flex items-center justify-center h-40 bg-slate-100 p-4">
                                      <FileText className="h-12 w-12 text-slate-400" />
                                      <span className="ml-2 text-sm text-slate-700">PDF Document</span>
                                    </div>
                                  ) : (
                                    <img 
                                      src={url} 
                                      alt={`Certificate ${index + 1}`} 
                                      className="w-full h-40 object-cover"
                                      onError={(e) => {
                                        // Fall back to generic doc icon if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtdGV4dCI+PHBhdGggZD0iTTE0IDJINmE yIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY4eiIvPjxwYXRoIGQ9Ik0xNCAydjZoNiIvPjxwYXRoIGQ9Ik0xNiAxM0g4Ii8+PHBhdGggZD0iTTE2IDE3SDgiLz48cGF0aCBkPSJNMTAgOUg4Ii8+PC9zdmc+';
                                      }}
                                    />
                                  )}
                                </a>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-md">
                                  <ExternalLink className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            )) : (
                              <div className="col-span-full text-slate-500 italic">
                                Định dạng chứng chỉ không hợp lệ. Vui lòng liên hệ quản trị viên.
                              </div>
                            );
                          } catch (error) {
                            console.error("Error parsing certifications:", error);
                            return (
                              <div className="col-span-full text-slate-500 italic">
                                {typeof tutorProfile.certifications === 'string' 
                                  ? tutorProfile.certifications 
                                  : 'Không thể hiển thị chứng chỉ. Định dạng không hỗ trợ.'}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  ) : (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Chưa có chứng chỉ</AlertTitle>
                      <AlertDescription>
                        Bạn chưa tải lên chứng chỉ nào. Tải lên để tăng tỷ lệ được phê duyệt.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="certification-upload" className="cursor-pointer">
                      <div className="flex items-center mb-2 text-primary hover:text-primary/80">
                        <Upload className="h-4 w-4 mr-1" />
                        <span>Tải lên chứng chỉ và bằng cấp</span>
                      </div>
                      <input
                        id="certification-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleCertificationsChange}
                      />
                    </label>
                    
                    {certifications.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm">
                          <p>{certifications.length} tệp đã chọn:</p>
                          <ul className="mt-1 list-disc list-inside">
                            {certifications.map((file, index) => (
                              <li key={index} className="text-muted-foreground">
                                {file.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <Button 
                          onClick={handleCertificationsUpload}
                          disabled={uploadingCertifications}
                          className="w-full"
                        >
                          {uploadingCertifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Tải lên
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-2">
                    <p>Chấp nhận các định dạng: PDF, DOC, DOCX, JPG, PNG</p>
                    <p>Tối đa 5 tệp, mỗi tệp không quá 5MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* Lịch trống Dialog */}
      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quản lý lịch trống</DialogTitle>
            <DialogDescription>
              Thiết lập thời gian bạn có thể dạy để học viên có thể đặt lịch với bạn
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Tab để chuyển đổi giữa việc xem/chỉnh sửa lịch hiện tại và thêm lịch mới */}
            <Tabs defaultValue="current">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Lịch đã lưu</TabsTrigger>
                <TabsTrigger value="add">Thêm lịch trống</TabsTrigger>
              </TabsList>
              
              {/* Tab hiển thị lịch hiện tại */}
              <TabsContent value="current">
                <div className="space-y-4 py-2">
                  {availabilityItems.length > 0 ? (
                    <div className="space-y-4">
                      {/* Danh sách lịch hàng tuần */}
                      {availabilityItems
                        .filter(item => item.type === 'weekly')
                        .map((item, index) => {
                          const weeklyItem = item as WeeklyAvailabilityItem;
                          return (
                            <div key={`weekly-${index}`} className="flex items-center space-x-4 p-4 border rounded-md">
                              <div className="w-auto">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                                  Hàng tuần
                                </Badge>
                              </div>
                              
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Select
                                  value={weeklyItem.day}
                                  onValueChange={(value) => {
                                    const newItems = [...availabilityItems];
                                    const itemIndex = availabilityItems.indexOf(item);
                                    if (itemIndex !== -1) {
                                      (newItems[itemIndex] as WeeklyAvailabilityItem).day = value as "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday";
                                      setAvailabilityItems(newItems);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn ngày" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monday">{formatWeekdayWithDate("monday")}</SelectItem>
                                    <SelectItem value="tuesday">{formatWeekdayWithDate("tuesday")}</SelectItem>
                                    <SelectItem value="wednesday">{formatWeekdayWithDate("wednesday")}</SelectItem>
                                    <SelectItem value="thursday">{formatWeekdayWithDate("thursday")}</SelectItem>
                                    <SelectItem value="friday">{formatWeekdayWithDate("friday")}</SelectItem>
                                    <SelectItem value="saturday">{formatWeekdayWithDate("saturday")}</SelectItem>
                                    <SelectItem value="sunday">{formatWeekdayWithDate("sunday")}</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">Từ:</span>
                                  <Input
                                    type="time"
                                    value={weeklyItem.startTime}
                                    onChange={(e) => {
                                      const newItems = [...availabilityItems];
                                      const itemIndex = availabilityItems.indexOf(item);
                                      if (itemIndex !== -1) {
                                        newItems[itemIndex].startTime = e.target.value;
                                        setAvailabilityItems(newItems);
                                      }
                                    }}
                                  />
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">Đến:</span>
                                  <Input
                                    type="time"
                                    value={weeklyItem.endTime}
                                    onChange={(e) => {
                                      const newItems = [...availabilityItems];
                                      const itemIndex = availabilityItems.indexOf(item);
                                      if (itemIndex !== -1) {
                                        newItems[itemIndex].endTime = e.target.value;
                                        setAvailabilityItems(newItems);
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAvailability(availabilityItems.indexOf(item))}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-4 h-4 text-destructive"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                              </Button>
                            </div>
                          );
                        })
                      }
                      
                      {/* Danh sách lịch ngày cụ thể */}
                      {availabilityItems
                        .filter(item => item.type === 'specific')
                        .map((item, index) => {
                          const specificItem = item as SpecificDateAvailabilityItem;
                          const specificDate = new Date(specificItem.date);
                          const isPastDate = specificDate < new Date();
                          
                          return (
                            <div key={`specific-${index}`} className={`flex items-center space-x-4 p-4 border rounded-md ${isPastDate ? 'opacity-50' : ''}`}>
                              <div className="w-auto">
                                <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                                  Ngày cụ thể
                                </Badge>
                                {isPastDate && (
                                  <Badge variant="outline" className="mt-1 bg-red-50 text-red-700 hover:bg-red-50 border-red-200">
                                    Đã qua
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Input
                                    type="date"
                                    value={specificItem.date}
                                    onChange={(e) => {
                                      const newItems = [...availabilityItems];
                                      const itemIndex = availabilityItems.indexOf(item);
                                      if (itemIndex !== -1) {
                                        (newItems[itemIndex] as SpecificDateAvailabilityItem).date = e.target.value;
                                        setAvailabilityItems(newItems);
                                      }
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {format(specificDate, 'EEEE', { locale: vi })}
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">Từ:</span>
                                  <Input
                                    type="time"
                                    value={specificItem.startTime}
                                    onChange={(e) => {
                                      const newItems = [...availabilityItems];
                                      const itemIndex = availabilityItems.indexOf(item);
                                      if (itemIndex !== -1) {
                                        newItems[itemIndex].startTime = e.target.value;
                                        setAvailabilityItems(newItems);
                                      }
                                    }}
                                  />
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">Đến:</span>
                                  <Input
                                    type="time"
                                    value={specificItem.endTime}
                                    onChange={(e) => {
                                      const newItems = [...availabilityItems];
                                      const itemIndex = availabilityItems.indexOf(item);
                                      if (itemIndex !== -1) {
                                        newItems[itemIndex].endTime = e.target.value;
                                        setAvailabilityItems(newItems);
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAvailability(availabilityItems.indexOf(item))}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-4 h-4 text-destructive"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                              </Button>
                            </div>
                          );
                        })
                      }
                      
                      {/* Danh sách lịch cũ (không có trường type) */}
                      {availabilityItems
                        .filter(item => !item.type && 'day' in item)
                        .map((item: any, index) => (
                          <div key={`legacy-${index}`} className="flex items-center space-x-4 p-4 border rounded-md">
                            <div className="w-auto">
                              <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200">
                                Định dạng cũ
                              </Badge>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <Select
                                value={item.day}
                                onValueChange={(value) => {
                                  const newItems = [...availabilityItems];
                                  const itemIndex = availabilityItems.indexOf(item);
                                  if (itemIndex !== -1) {
                                    newItems[itemIndex].day = value as any;
                                    setAvailabilityItems(newItems);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn ngày" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monday">{formatWeekdayWithDate("monday")}</SelectItem>
                                  <SelectItem value="tuesday">{formatWeekdayWithDate("tuesday")}</SelectItem>
                                  <SelectItem value="wednesday">{formatWeekdayWithDate("wednesday")}</SelectItem>
                                  <SelectItem value="thursday">{formatWeekdayWithDate("thursday")}</SelectItem>
                                  <SelectItem value="friday">{formatWeekdayWithDate("friday")}</SelectItem>
                                  <SelectItem value="saturday">{formatWeekdayWithDate("saturday")}</SelectItem>
                                  <SelectItem value="sunday">{formatWeekdayWithDate("sunday")}</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Từ:</span>
                                <Input
                                  type="time"
                                  value={item.startTime}
                                  onChange={(e) => {
                                    const newItems = [...availabilityItems];
                                    const itemIndex = availabilityItems.indexOf(item);
                                    if (itemIndex !== -1) {
                                      newItems[itemIndex].startTime = e.target.value;
                                      setAvailabilityItems(newItems);
                                    }
                                  }}
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Đến:</span>
                                <Input
                                  type="time"
                                  value={item.endTime}
                                  onChange={(e) => {
                                    const newItems = [...availabilityItems];
                                    const itemIndex = availabilityItems.indexOf(item);
                                    if (itemIndex !== -1) {
                                      newItems[itemIndex].endTime = e.target.value;
                                      setAvailabilityItems(newItems);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAvailability(availabilityItems.indexOf(item))}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-4 h-4 text-destructive"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                            </Button>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed rounded-md">
                      <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        Bạn chưa thiết lập lịch trống. Chuyển sang tab "Thêm lịch trống" để bắt đầu.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Tab thêm lịch mới */}
              <TabsContent value="add">
                <div className="space-y-4 py-2">
                  {/* Chọn loại lịch trống */}
                  <Tabs value={availabilityType} onValueChange={(value) => setAvailabilityType(value as "weekly" | "specific")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="weekly">Lịch hàng tuần</TabsTrigger>
                      <TabsTrigger value="specific">Ngày cụ thể</TabsTrigger>
                    </TabsList>
                    
                    {/* Form thêm lịch hàng tuần */}
                    <TabsContent value="weekly">
                      <div className="p-4 border rounded-md mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="weekly-day">Ngày trong tuần</Label>
                            <Select 
                              value={newAvailabilityItem.day}
                              onValueChange={(value) => 
                                setNewAvailabilityItem({ 
                                  ...newAvailabilityItem, 
                                  day: value as "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday"
                                })
                              }
                            >
                              <SelectTrigger id="weekly-day">
                                <SelectValue placeholder="Chọn ngày" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monday">Thứ Hai</SelectItem>
                                <SelectItem value="tuesday">Thứ Ba</SelectItem>
                                <SelectItem value="wednesday">Thứ Tư</SelectItem>
                                <SelectItem value="thursday">Thứ Năm</SelectItem>
                                <SelectItem value="friday">Thứ Sáu</SelectItem>
                                <SelectItem value="saturday">Thứ Bảy</SelectItem>
                                <SelectItem value="sunday">Chủ Nhật</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatWeekdayWithDate(newAvailabilityItem.day)}
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="weekly-start">Thời gian bắt đầu</Label>
                            <Input
                              id="weekly-start"
                              type="time"
                              value={newAvailabilityItem.startTime}
                              onChange={(e) => 
                                setNewAvailabilityItem({ 
                                  ...newAvailabilityItem, 
                                  startTime: e.target.value 
                                })
                              }
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="weekly-end">Thời gian kết thúc</Label>
                            <Input
                              id="weekly-end"
                              type="time"
                              value={newAvailabilityItem.endTime}
                              onChange={(e) => 
                                setNewAvailabilityItem({ 
                                  ...newAvailabilityItem, 
                                  endTime: e.target.value 
                                })
                              }
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="button" 
                          className="w-full mt-4"
                          onClick={handleAddWeeklyAvailability}
                        >
                          Thêm lịch hàng tuần
                        </Button>
                      </div>
                    </TabsContent>
                    
                    {/* Form thêm lịch theo ngày cụ thể */}
                    <TabsContent value="specific">
                      <div className="p-4 border rounded-md mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="specific-date">Ngày cụ thể</Label>
                            <Input
                              id="specific-date"
                              type="date"
                              value={newSpecificDateItem.date}
                              onChange={(e) => 
                                setNewSpecificDateItem({ 
                                  ...newSpecificDateItem, 
                                  date: e.target.value 
                                })
                              }
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(newSpecificDateItem.date), 'EEEE', { locale: vi })}
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="specific-start">Thời gian bắt đầu</Label>
                            <Input
                              id="specific-start"
                              type="time"
                              value={newSpecificDateItem.startTime}
                              onChange={(e) => 
                                setNewSpecificDateItem({ 
                                  ...newSpecificDateItem, 
                                  startTime: e.target.value 
                                })
                              }
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="specific-end">Thời gian kết thúc</Label>
                            <Input
                              id="specific-end"
                              type="time"
                              value={newSpecificDateItem.endTime}
                              onChange={(e) => 
                                setNewSpecificDateItem({ 
                                  ...newSpecificDateItem, 
                                  endTime: e.target.value 
                                })
                              }
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="button" 
                          className="w-full mt-4"
                          onClick={handleAddSpecificDateAvailability}
                        >
                          Thêm lịch ngày cụ thể
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
            </Tabs>
            
            {availabilityItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Thêm khung giờ trống bằng cách nhập thông tin ở trên và nhấn nút +
              </p>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setAvailabilityDialogOpen(false)}
              >
                Huỷ
              </Button>
              <Button 
                onClick={handleSubmitAvailability}
                disabled={updateAvailabilityMutation.isPending}
              >
                {updateAvailabilityMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Lưu lịch trống
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Profile Edit Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tutorProfile ? "Edit Profile" : "Create Profile"}</DialogTitle>
            <DialogDescription>
              {tutorProfile 
                ? "Update your tutor profile information" 
                : "Create your tutor profile to start receiving student inquiries"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
              <FormField
                control={profileForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell students about yourself, your teaching style, and your areas of expertise..." 
                        className="min-h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 50 characters. This is what students will see first.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={profileForm.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List your academic qualifications, degrees, and institutions..." 
                          className="min-h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 20 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your teaching experience, positions, and achievements..." 
                          className="min-h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 20 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={profileForm.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate (VND)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Amount in VND per hour
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="teachingMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teaching Mode</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "online"}
                        defaultValue={field.value || "online"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select teaching mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="online">Online Only</SelectItem>
                          <SelectItem value="offline">In-Person Only</SelectItem>
                          <SelectItem value="both">Both Online & In-Person</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How you prefer to conduct tutoring sessions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <FormLabel>Subjects</FormLabel>
                  <FormDescription className="mb-2">
                    Select the subjects you can teach
                  </FormDescription>
                  
                  <CheckboxGroup
                    value={selectedSubjects}
                    onValueChange={setSelectedSubjects}
                    className="grid grid-cols-2 md:grid-cols-3 gap-2"
                  >
                    {subjects?.map((subject: any) => (
                      <CheckboxItem
                        key={subject.id}
                        id={`subject-${subject.id}`}
                        value={subject.id.toString()}
                        label={subject.name}
                      />
                    ))}
                  </CheckboxGroup>
                  
                  {selectedSubjects.length === 0 && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      Please select at least one subject
                    </p>
                  )}
                </div>
                
                <div>
                  <FormLabel>Education Levels</FormLabel>
                  <FormDescription className="mb-2">
                    Select the education levels you can teach
                  </FormDescription>
                  
                  <CheckboxGroup
                    value={selectedLevels}
                    onValueChange={setSelectedLevels}
                    className="grid grid-cols-2 md:grid-cols-3 gap-2"
                  >
                    {educationLevels?.map((level: any) => (
                      <CheckboxItem
                        key={level.id}
                        id={`level-${level.id}`}
                        value={level.id.toString()}
                        label={level.name}
                      />
                    ))}
                  </CheckboxGroup>
                  
                  {selectedLevels.length === 0 && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      Please select at least one education level
                    </p>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={
                    profileMutation.isPending || 
                    selectedSubjects.length === 0 || 
                    selectedLevels.length === 0
                  }
                >
                  {profileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tutorProfile ? "Update Profile" : "Create Profile"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TutorDashboardLayout>
  );
}