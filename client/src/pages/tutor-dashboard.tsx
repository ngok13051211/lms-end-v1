import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSelector, useDispatch } from "react-redux";
import { updateAvatar } from "@/features/auth/authSlice";
import { RootState } from "@/store";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Upload,
  AlertCircle,
  ChevronRight,
  UserCircle,
  BookOpen,
  MessageSquare,
  BadgeCheck,
  DollarSign,
  Star,
  FileText,
  Check,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Form schema for tutor profile
const tutorProfileSchema = z.object({
  bio: z.string().min(50, "Giới thiệu phải có ít nhất 50 ký tự"),

  // Ngày sinh
  date_of_birth: z.string().optional(),

  // Địa chỉ
  address: z.string().optional(),

  // Các trường khác như môn học (subjects), cấp độ giảng dạy (levels),
  // và lịch trống (availability) được xử lý riêng
});

// Form schema for course
const courseSchema = z.object({
  title: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự"),
  description: z.string().min(20, "Mô tả phải có ít nhất 20 ký tự"),
  subjectId: z.string().min(1, "Môn học là bắt buộc"),
  levelId: z.string().min(1, "Cấp độ giáo dục là bắt buộc"),
  hourlyRate: z.coerce
    .number()
    .min(10000, "Giá theo giờ phải ít nhất 10.000 VND")
    .max(99999999, "Giá theo giờ phải ít hơn 100.000.000 VND"),
  teachingMode: z.enum(["online", "offline", "both"]),
});

export default function TutorDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);

  // Define TutorProfile interface
  interface TutorProfile {
    bio: string;
    date_of_birth?: string;
    address?: string;
    // hourly_rate?: number;
    // teaching_mode?: string;
    subjects?: Array<{ id: number; name: string }>;
    is_verified: boolean;
    rating: number;
    total_reviews: number;
  }

  // Get tutor profile
  const {
    data: tutorProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchTutorProfile,
  } = useQuery<TutorProfile>({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false, // Don't retry on error
    refetchInterval: 3000, // Refetch every 3 seconds to keep data fresh
  });

  // Only load other data if profile exists
  const hasProfile = !!tutorProfile && !profileError;

  interface Subject {
    id: number;
    name: string;
  }

  interface EducationLevel {
    id: number;
    name: string;
  }

  // Get subjects and education levels for profile editing
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: [`/api/v1/subjects`],
    enabled: true, // Always fetch subjects for profile creation
  });

  const { data: educationLevels = [] } = useQuery<EducationLevel[]>({
    queryKey: [`/api/v1/education-levels`],
    enabled: true, // Always fetch education levels for profile creation
  });

  // Get tutor's courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery<any[]>({
    queryKey: [`/api/v1/tutors/courses`],
    enabled: hasProfile, // Only fetch if profile exists
  });

  // Get all conversations
  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery<any[]>({
      queryKey: [`/api/v1/conversations`],
      enabled: hasProfile, // Only fetch if profile exists
    });

  // Define Stats interface
  interface TutorStats {
    profileViews: number;
    totalStudents: number;
    averageRating: number;
    // Add any other stats properties that you need
  }

  // Get tutor's stats
  const { data: stats, isLoading: statsLoading } = useQuery<TutorStats>({
    queryKey: [`/api/v1/tutors/stats`],
    enabled: hasProfile, // Only fetch if profile exists
  });

  // Tutor profile form
  const profileForm = useForm<z.infer<typeof tutorProfileSchema>>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      bio: tutorProfile?.bio || "",
      date_of_birth: tutorProfile?.date_of_birth || "",
      address: tutorProfile?.address || "",
    },
  });

  // Course form
  const courseForm = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      levelId: "",
      hourlyRate: 0,
      teachingMode: "online",
    },
  });

  // State để quản lý chứng chỉ
  const [certifications, setCertifications] = useState<File[]>([]);
  const [uploadingCertifications, setUploadingCertifications] = useState(false);

  // Upload chứng chỉ
  const handleCertificationsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setCertifications(files);
      toast({
        title: "Đã chọn files",
        description: `Đã chọn ${files.length} file. Nhấn "Cập nhật hồ sơ" để tải lên.`,
        variant: "default",
      });
    }
  };

  // Create/Update tutor profile
  const profileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tutorProfileSchema>) => {
      const method = tutorProfile ? "PATCH" : "POST";
      const formattedData = {
        bio: data.bio,
        date_of_birth: data.date_of_birth,
        address: data.address,
        subject_ids: selectedSubjects.length > 0 ? selectedSubjects : undefined,
      };

      console.log("Sending data to create/update profile:", formattedData);

      const response = await apiRequest(
        method,
        "/api/v1/tutors/profile",
        formattedData
      );

      // Upload certifications if any
      if (certifications.length > 0) {
        const formData = new FormData();
        certifications.forEach((file) => {
          formData.append("documents", file);
        });

        await fetch("/api/v1/tutors/certifications", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Profile created/updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      setProfileDialogOpen(false);

      // Show success notification
      toast({
        title: tutorProfile ? "Hồ sơ đã cập nhật" : "Hồ sơ đã tạo",
        description: tutorProfile
          ? "Hồ sơ gia sư của bạn đã được cập nhật thành công."
          : "Hồ sơ gia sư của bạn đã được tạo thành công.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error creating/updating profile:", error);

      // Show error notification
      toast({
        title: "Cập nhật hồ sơ thất bại",
        description:
          error instanceof Error
            ? error.message
            : "Không thể lưu thông tin hồ sơ của bạn. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  // Create course
  const createCourseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSchema>) => {
      const response = await apiRequest("POST", "/api/v1/courses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/courses`] });
      courseForm.reset();
      setCourseDialogOpen(false);

      // Show success notification
      toast({
        title: "Khóa học đã tạo",
        description: "Khóa học giảng dạy của bạn đã được tạo thành công.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Course creation error:", error);

      // Show error notification
      toast({
        title: "Tạo khóa học thất bại",
        description:
          error instanceof Error
            ? error.message
            : "Không thể tạo khóa học giảng dạy của bạn. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  // Delete course
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/v1/courses/${courseId}`,
        undefined
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/courses`] });

      // Show success notification
      toast({
        title: "Khóa học đã xóa",
        description: "Khóa học giảng dạy của bạn đã được xóa thành công.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Course deletion error:", error);

      // Show error notification
      toast({
        title: "Xóa thất bại",
        description:
          error instanceof Error
            ? error.message
            : "Không thể xóa khóa học giảng dạy của bạn. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  // Upload avatar
  const uploadAvatar = async () => {
    if (!avatar) return;

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", avatar);

      console.log("Uploading avatar file:", avatar.name, "size:", avatar.size);

      // Lấy token từ localStorage
      const token = localStorage.getItem("token");

      // Tạo headers với token nếu có
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log(
        "Uploading avatar with token:",
        token ? "Token exists" : "No token"
      );

      const response = await fetch("/api/v1/users/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
        // Không set Content-Type header cho form-data, trình duyệt sẽ tự động thêm với boundary
      });

      // Log response for debugging
      console.log("Avatar upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        throw new Error(
          `Upload failed with status: ${response.status}. ${errorText}`
        );
      }

      // Lấy phản hồi từ server để cập nhật avatar ngay lập tức
      const responseData = await response.json();
      console.log("Upload response data:", responseData);

      // Cập nhật store với avatar mới
      if (responseData.user && responseData.user.avatar) {
        // Dispatch action để cập nhật avatar trong Redux store
        dispatch(updateAvatar(responseData.user.avatar));
        console.log(
          "Dispatched updateAvatar action with:",
          responseData.user.avatar
        );
      }

      // Thực hiện refetch ngay lập tức để lấy dữ liệu mới nhất
      await refetchTutorProfile();

      // Invalidate cả query cache để các phần khác của ứng dụng cũng được cập nhật
      queryClient.invalidateQueries({ queryKey: [`/api/v1/auth/me`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });

      // Show success notification
      toast({
        title: "Ảnh đại diện đã cập nhật",
        description: "Ảnh hồ sơ của bạn đã được cập nhật thành công.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);

      // Show error notification
      toast({
        title: "Tải lên thất bại",
        description:
          error instanceof Error
            ? error.message
            : "Không thể tải lên ảnh hồ sơ. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      setAvatar(null);
    }
  };

  // When opening the profile dialog, set the default values
  const handleOpenProfileDialog = () => {
    console.log("Opening profile dialog");

    // Force refresh tutor profile before opening the dialog
    refetchTutorProfile().then(() => {
      // Reset form with default values
      if (tutorProfile && !profileError) {
        profileForm.reset({
          bio: tutorProfile.bio || "",
          date_of_birth: tutorProfile.date_of_birth || "",
          address: tutorProfile.address || "",
        });

        // Thiết lập môn học đã chọn
        if (tutorProfile.subjects && Array.isArray(tutorProfile.subjects)) {
          const subjectIds = tutorProfile.subjects.map((subject: any) =>
            String(subject.id)
          );
          setSelectedSubjects(subjectIds);
        } else {
          setSelectedSubjects([]);
        }

        // Reset certifications list
        setCertifications([]);
      } else {
        // Reset form for new profile with empty values
        profileForm.reset({
          bio: "",
          date_of_birth: "",
          address: "",
        });

        // Reset subject selection
        setSelectedSubjects([]);

        // Reset certifications list
        setCertifications([]);
      }

      // Open dialog after form reset
      setProfileDialogOpen(true);
    });
  };

  const handleOnAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Selected file:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
      });

      // Validate file size (under 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `The image must be less than 5MB. Your file is ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB.`,
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
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
        description: `${file.name} (${(file.size / 1024).toFixed(
          2
        )}KB) ready to upload. Click Apply to upload.`,
        variant: "default",
      });
    }
  };

  const isLoading =
    profileLoading || coursesLoading || conversationsLoading || statsLoading;

  // Show complete profile notice if no tutor profile
  if (profileError && profileError.message === "Invalid tutor ID") {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Why Complete Your Profile?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Be discovered by students looking for tutors in your
                      subjects
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Create teaching ads for specific subjects and levels
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Receive messages and inquiries from interested students
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Build your reputation through ratings and reviews
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Review Process</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                  <li className="mb-6 ml-6">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-primary rounded-full -left-4 ring-4 ring-white dark:ring-gray-900 text-white">
                      1
                    </span>
                    <h3 className="mb-1 text-lg font-semibold">
                      Create Profile
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Fill out your profile information completely
                    </p>
                  </li>
                  <li className="mb-6 ml-6">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-primary/70 rounded-full -left-4 ring-4 ring-white dark:ring-gray-900 text-white">
                      2
                    </span>
                    <h3 className="mb-1 text-lg font-semibold">Admin Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Our team will review your profile
                    </p>
                  </li>
                  <li className="ml-6">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-primary/50 rounded-full -left-4 ring-4 ring-white dark:ring-gray-900 text-white">
                      3
                    </span>
                    <h3 className="mb-1 text-lg font-semibold">
                      Start Teaching
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Once approved, you can create ads and teach students
                    </p>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium mb-1">Dashboard</h1>
            <p className="text-muted-foreground">
              Quản lý hồ sơ, quảng cáo và thông tin sinh viên của bạn
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCircle className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">
                    Trạng thái hồ sơ
                  </p>
                  <p className="text-lg font-medium">
                    {tutorProfile ? "Hoàn thành" : "Chưa hoàn thành"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">
                    Các khóa học đang hoạt động
                  </p>
                  <p className="text-lg font-medium">{courses?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">
                    Cuộc trò chuyện
                  </p>
                  <p className="text-lg font-medium">
                    {conversations?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-8">
            <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
            <TabsTrigger value="courses">Khóa học</TabsTrigger>
            <TabsTrigger value="messages">Tin nhắn</TabsTrigger>
            <TabsTrigger value="stats">Thống kê</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Hồ sơ gia sư</CardTitle>
                <CardDescription>
                  Thông tin hồ sơ của bạn hiển thị cho sinh viên
                </CardDescription>
              </CardHeader>

              <CardContent>
                {tutorProfile ? (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-shrink-0">
                        <Avatar className="h-32 w-32 border-2 border-primary">
                          <AvatarImage
                            src={user?.avatar || undefined}
                            alt={user?.first_name}
                          />
                          <AvatarFallback className="text-3xl">
                            {user?.first_name?.[0]}
                            {user?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Họ và tên
                            </h3>
                            <p className="text-base font-medium">
                              {user?.first_name} {user?.last_name}
                            </p>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Email
                            </h3>
                            <p className="text-base">{user?.email}</p>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Trạng thái xác minh
                            </h3>
                            <div className="flex items-center">
                              {tutorProfile.is_verified ? (
                                <>
                                  <BadgeCheck className="h-4 w-4 text-success mr-1" />
                                  <span className="text-success">
                                    Đã xác minh
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-warning mr-1" />
                                  <span className="text-warning">
                                    Đang chờ xác minh
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Đánh giá
                            </h3>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-warning fill-warning mr-1" />
                              <span>
                                {tutorProfile.rating} (
                                {tutorProfile.total_reviews} đánh giá)
                              </span>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Ngày sinh
                            </h3>
                            <p className="text-base">
                              {tutorProfile.date_of_birth
                                ? new Date(
                                    tutorProfile.date_of_birth
                                  ).toLocaleDateString("vi-VN")
                                : "Chưa cập nhật"}
                            </p>
                          </div>

                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Địa chỉ
                            </h3>
                            <p className="text-base">
                              {tutorProfile.address || "Chưa cập nhật"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-2">Giới thiệu</h3>
                      <p className="whitespace-pre-line">{tutorProfile.bio}</p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        Môn học giảng dạy
                      </h3>
                      {tutorProfile.subjects &&
                      tutorProfile.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {tutorProfile.subjects.map((subject) => (
                            <Badge
                              key={subject.id}
                              variant="secondary"
                              className="px-3 py-1"
                            >
                              {subject.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          Chưa có môn học giảng dạy nào.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">Chưa có hồ sơ</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Bạn chưa tạo hồ sơ gia sư. Hãy tạo hồ sơ để bắt đầu nhận
                      yêu cầu từ học sinh.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Khóa học của tôi</CardTitle>
                  <CardDescription>
                    Tạo và quản lý các khóa học của bạn
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {courses && courses.length > 0 ? (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                          <h3 className="text-lg font-medium">
                            {course.title}
                          </h3>

                          <div className="flex items-center mt-2 md:mt-0">
                            <Badge
                              variant={
                                course.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`mr-4 ${
                                course.status === "active"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : ""
                              }`}
                            >
                              {course.status === "active"
                                ? "Active"
                                : "Inactive"}
                            </Badge>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                deleteCourseMutation.mutate(course.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-4">
                          {course.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {course.subject && (
                            <Badge variant="outline">
                              {course.subject.name}
                            </Badge>
                          )}

                          {course.level && (
                            <Badge variant="outline">{course.level.name}</Badge>
                          )}

                          <Badge variant="outline">
                            {course.teachingMode === "online"
                              ? "Online"
                              : course.teachingMode === "offline"
                              ? "In-person"
                              : "Online & In-person"}
                          </Badge>
                        </div>

                        <div className="flex items-center">
                          <span className="font-medium text-secondary">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(Number(course.hourlyRate))}{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                              /hour
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">
                      Chưa có khóa học nào
                    </h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Bạn chưa tạo khóa học nào. Tạo khóa học đầu tiên để thu
                      hút học viên.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Tin nhắn</CardTitle>
                <CardDescription>
                  Cuộc trò chuyện của bạn với sinh viên
                </CardDescription>
              </CardHeader>

              <CardContent>
                {conversations && conversations.length > 0 ? (
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <a
                        key={conversation.id}
                        href={`/dashboard/tutor/messages/${conversation.id}`}
                        className="flex items-center p-4 border rounded-lg hover:border-primary transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={conversation.student?.avatar}
                            alt={conversation.student?.firstName}
                          />
                          <AvatarFallback>
                            {conversation.student?.firstName?.[0]}
                            {conversation.student?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {conversation.student?.firstName}{" "}
                              {conversation.student?.lastName}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(
                                conversation.lastMessageAt
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage?.content ||
                              "Start a conversation"}
                          </p>
                        </div>

                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">
                      Chưa có tin nhắn
                    </h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Bạn chưa nhận được bất kỳ tin nhắn nào từ các sinh viên.
                      Hoàn thành hồ sơ của bạn và tạo các khóa học để thu hút
                      sinh viên
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Thống kê</CardTitle>
                <CardDescription>
                  Tổng quan về hiệu suất hồ sơ của bạn
                </CardDescription>
              </CardHeader>

              <CardContent>
                {stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Profile Views
                            </p>
                            <p className="text-2xl font-medium">
                              {stats.profileViews}
                            </p>
                          </div>
                          <UserCircle className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Total Students
                            </p>
                            <p className="text-2xl font-medium">
                              {stats.totalStudents}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Avg. Rating
                            </p>
                            <div className="flex items-center">
                              <p className="text-2xl font-medium">
                                {stats.averageRating}
                              </p>
                              <Star className="ml-1 h-5 w-5 text-warning fill-warning" />
                            </div>
                          </div>
                          <Star className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Additional stats cards can be added here */}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">
                      Không có số liệu thống kê có sẵn
                    </h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Thống kê sẽ có sẵn khi hồ sơ của bạn hoạt động và bạn bắt
                      đầu nhận được tương tác của sinh viên.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile Dialog */}
      <Dialog
        modal={true}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {tutorProfile ? "Edit Tutor Profile" : "Create Tutor Profile"}
            </DialogTitle>
            <DialogDescription>
              {tutorProfile
                ? "Update your tutor profile information"
                : "Complete your tutor profile to attract students"}
            </DialogDescription>
          </DialogHeader>

          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit((data) =>
                profileMutation.mutate(data)
              )}
              className="space-y-6"
            >
              <div className="space-y-4">
                {/* Bio Field */}
                <div>
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giới thiệu bản thân</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Viết về bản thân, triết lý giảng dạy của bạn và điều gì làm cho bạn trở thành một gia sư tuyệt vời"
                            className="min-h-[200px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Tối thiểu 50 ký tự. Bao gồm thông tin về bản thân,
                          phong cách giảng dạy và các chi tiết khác mà học sinh
                          muốn biết.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Date of Birth Field */}
                <div>
                  <FormField
                    control={profileForm.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày sinh</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          Ngày sinh của bạn (tùy chọn)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address Field */}
                <div>
                  <FormField
                    control={profileForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Địa chỉ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập địa chỉ của bạn"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Địa chỉ của bạn (tùy chọn)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Phần chọn môn học */}
                <div>
                  <Label className="text-base">Môn học giảng dạy</Label>
                  <div className="mt-2">
                    <div className="border rounded-md p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {subjects?.map((subject) => (
                          <div
                            key={subject.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`subject-select-${subject.id}`}
                              checked={selectedSubjects.includes(
                                String(subject.id)
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSubjects([
                                    ...selectedSubjects,
                                    String(subject.id),
                                  ]);
                                } else {
                                  setSelectedSubjects(
                                    selectedSubjects.filter(
                                      (id) => id !== String(subject.id)
                                    )
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`subject-select-${subject.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {subject.name}
                            </label>
                          </div>
                        ))}
                      </div>

                      {!subjects ||
                        (subjects.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            Không có môn học nào để hiển thị
                          </div>
                        ))}
                    </div>
                    <FormDescription className="mt-1">
                      Chọn môn học bạn có thể giảng dạy
                    </FormDescription>
                  </div>
                </div>

                {/* Phần tải chứng chỉ */}
                <div>
                  <Label className="text-base">Chứng chỉ & Giấy tờ</Label>
                  <div className="mt-2">
                    <div className="border rounded-md p-4">
                      <label
                        htmlFor="certification-upload"
                        className="cursor-pointer block"
                      >
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-primary transition-colors">
                          <Upload className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            Chọn hoặc kéo thả file vào đây
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Hỗ trợ PDF, JPG, PNG (tối đa 5MB)
                          </p>
                        </div>
                        <input
                          id="certification-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          onChange={handleCertificationsChange}
                        />
                      </label>

                      {certifications.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">
                            Đã chọn {certifications.length} file:
                          </p>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {certifications.map((file, index) => (
                              <li key={index} className="truncate">
                                {file.name} ({(file.size / 1024).toFixed(2)}KB)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <FormDescription className="mt-1">
                      Tải lên các chứng chỉ, bằng cấp để tăng uy tín
                    </FormDescription>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tutorProfile ? "Đang cập nhật..." : "Đang tạo..."}
                    </>
                  ) : tutorProfile ? (
                    "Cập nhật hồ sơ"
                  ) : (
                    "Tạo hồ sơ"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
