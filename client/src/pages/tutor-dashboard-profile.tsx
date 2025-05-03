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
import { Loader2, Edit, Upload, AlertCircle, UserCircle, BadgeCheck, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";

// Định nghĩa cấu trúc cho một khung giờ trống
const availabilityItemSchema = z.object({
  day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  startTime: z.string(), // Format: "HH:MM" in 24h
  endTime: z.string(),   // Format: "HH:MM" in 24h
});

// Định nghĩa kiểu dữ liệu cho một khung giờ trống
export type AvailabilityItem = z.infer<typeof availabilityItemSchema>;

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
  const [newAvailabilityItem, setNewAvailabilityItem] = useState<AvailabilityItem>({
    day: "monday",
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
          const parsedAvailability = JSON.parse(tutorProfile.availability);
          if (Array.isArray(parsedAvailability)) {
            setAvailabilityItems(parsedAvailability);
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
      // Chuyển danh sách availability thành chuỗi JSON
      const availabilityJson = JSON.stringify(availabilityData);
      
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
  const handleAddAvailability = () => {
    setAvailabilityItems([...availabilityItems, newAvailabilityItem]);
    setNewAvailabilityItem({
      day: "monday",
      startTime: "08:00",
      endTime: "17:00"
    });
  };
  
  // Xóa một khung giờ trống
  const handleRemoveAvailability = (index: number) => {
    const newItems = [...availabilityItems];
    newItems.splice(index, 1);
    setAvailabilityItems(newItems);
  };
  
  // Cập nhật thông tin lịch trống
  const handleSubmitAvailability = () => {
    updateAvailabilityMutation.mutate(availabilityItems);
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availabilityItems.map((item, index) => (
                      <div key={index} className="border rounded-md p-4 flex flex-col">
                        <div className="font-medium mb-2">
                          {(() => {
                            switch(item.day) {
                              case 'monday': return 'Thứ Hai';
                              case 'tuesday': return 'Thứ Ba';
                              case 'wednesday': return 'Thứ Tư';
                              case 'thursday': return 'Thứ Năm';
                              case 'friday': return 'Thứ Sáu';
                              case 'saturday': return 'Thứ Bảy';
                              case 'sunday': return 'Chủ Nhật';
                              default: return item.day;
                            }
                          })()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{item.startTime} - {item.endTime}</span>
                        </div>
                      </div>
                    ))}
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
            <div className="space-y-4">
              {availabilityItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-md">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      value={item.day}
                      onValueChange={(value) => {
                        const newItems = [...availabilityItems];
                        newItems[index].day = value as any;
                        setAvailabilityItems(newItems);
                      }}
                    >
                      <SelectTrigger>
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
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Từ:</span>
                      <Input
                        type="time"
                        value={item.startTime}
                        onChange={(e) => {
                          const newItems = [...availabilityItems];
                          newItems[index].startTime = e.target.value;
                          setAvailabilityItems(newItems);
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
                          newItems[index].endTime = e.target.value;
                          setAvailabilityItems(newItems);
                        }}
                      />
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAvailability(index)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-4 h-4 text-destructive"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center p-4 border border-dashed rounded-md">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={newAvailabilityItem.day}
                  onValueChange={(value) => {
                    setNewAvailabilityItem({
                      ...newAvailabilityItem,
                      day: value as any
                    });
                  }}
                >
                  <SelectTrigger>
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
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Từ:</span>
                  <Input
                    type="time"
                    value={newAvailabilityItem.startTime}
                    onChange={(e) => {
                      setNewAvailabilityItem({
                        ...newAvailabilityItem,
                        startTime: e.target.value
                      });
                    }}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Đến:</span>
                  <Input
                    type="time"
                    value={newAvailabilityItem.endTime}
                    onChange={(e) => {
                      setNewAvailabilityItem({
                        ...newAvailabilityItem,
                        endTime: e.target.value
                      });
                    }}
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAddAvailability}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-4 h-4"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
              </Button>
            </div>
            
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