import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { updateUserProfile, updateAvatar } from "@/features/auth/authSlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Edit,
  Upload,
  AlertCircle,
  BadgeCheck,
  Star,
  BookOpen,
  GraduationCap,
  FileCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { format } from "date-fns";
import TeachingRequestsList from "@/components/tutor/TeachingRequestsList";

// Form schema for tutor profile
const tutorProfileSchema = z.object({
  bio: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  first_name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
  last_name: z.string().min(2, "Họ phải có ít nhất 2 ký tự").optional(),
  phone: z.string().optional(),
});

// Schema for teaching requests
const teachingRequestSchema = z.object({
  subject_id: z.string({
    required_error: "Vui lòng chọn môn học",
  }),
  level_id: z.string({
    required_error: "Vui lòng chọn cấp dạy",
  }),
  introduction: z.string().min(10, "Giới thiệu phải có ít nhất 10 ký tự"),
  experience: z.string().min(10, "Kinh nghiệm phải có ít nhất 10 ký tự"),
});

export default function TutorDashboardProfile() {
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Teaching request state
  const [teachingRequestDialogOpen, setTeachingRequestDialogOpen] = useState(false);
  const [requestCertifications, setRequestCertifications] = useState<File[]>([]);
  const [uploadingCertifications, setUploadingCertifications] = useState(false);

  // Get tutor profile
  const {
    data: tutorProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchTutorProfile,
  } = useQuery<any>({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false,
    staleTime: 0,
    refetchInterval: 1000,
  });

  // Setup profile form
  const profileForm = useForm<z.infer<typeof tutorProfileSchema>>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      bio: "",
      date_of_birth: "",
      address: "",
    },
  });

  // Teaching request form
  const teachingRequestForm = useForm<z.infer<typeof teachingRequestSchema>>({
    resolver: zodResolver(teachingRequestSchema),
    defaultValues: {
      subject_id: "",
      level_id: "",
      introduction: "",
      experience: "",
    },
  });

  // Fetch subjects and education levels for teaching request
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: [`/api/v1/subjects`],
    enabled: teachingRequestDialogOpen,
  });

  const { data: educationLevels = [] } = useQuery<any[]>({
    queryKey: [`/api/v1/education-levels`],
    enabled: teachingRequestDialogOpen,
  });
  // State để lưu preview URL của avatar đã chọn
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Handle file change for avatar upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatar(file);

      // Tạo URL preview cho avatar
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  // Handle certificate file change for teaching request
  const handleCertificationsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setRequestCertifications(files);
    }
  };

  // Avatar upload mutation
  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);

      // API call to upload avatar
      const res = await fetch("/api/v1/users/avatar", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage =
          errorData && errorData.message
            ? errorData.message
            : "Failed to upload avatar";
        throw new Error(errorMessage);
      }

      return res.json();
    }, onSuccess: (data) => {
      // Cập nhật avatar trong Redux store ngay lập tức
      if (data && data.data && data.data.user && data.data.user.avatar) {
        dispatch(updateAvatar(data.data.user.avatar));
      }

      toast({
        title: "Ảnh đại diện đã cập nhật",
        description: "Ảnh đại diện của bạn đã được cập nhật thành công",
        variant: "default",
      });
      // Giải phóng URL đối tượng
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }

      setAvatar(null);
      setAvatarPreview(null);

      // Force reload user data
      queryClient.invalidateQueries({ queryKey: [`/api/v1/auth/me`] });
      // Also reload tutor profile
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    if (!avatar) {
      toast({
        title: "Chưa chọn tệp",
        description: "Vui lòng chọn một tệp để tải lên",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      await avatarUploadMutation.mutateAsync(avatar);
    } finally {
      setUploadingAvatar(false);
    }
  };
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tutorProfileSchema>) => {
      // Chỉ gửi dữ liệu cơ bản
      const profileData = {
        bio: data.bio || "",
        date_of_birth: data.date_of_birth,
        address: data.address,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      };

      console.log("Updating profile with:", profileData);

      const res = await apiRequest(
        "PATCH",
        `/api/v1/tutors/profile`,
        profileData
      );
      return res.json();
    }, onSuccess: (data) => {
      // Invalidate cả hồ sơ gia sư và thông tin user
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/auth/me`] });      // Cập nhật Redux store với thông tin mới
      if (data.data) {
        // Cập nhật thông tin user trong Redux store
        dispatch(updateUserProfile({
          first_name: data.data.first_name,
          last_name: data.data.last_name,
          phone: data.data.phone
        }));
      }

      // Đóng dialog
      setProfileDialogOpen(false);

      toast({
        title: "Hồ sơ đã được cập nhật",
        description: "Thông tin hồ sơ của bạn đã được cập nhật thành công",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Cập nhật thất bại",
        description:
          error instanceof Error ? error.message : "Không thể cập nhật hồ sơ",
        variant: "destructive",
      });
    },
  });

  // Certification upload mutation for teaching request
  const certificationsUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("documents", file);
      });

      const res = await fetch("/api/v1/tutors/certifications", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error("Không thể tải lên chứng chỉ");
      }

      const data = await res.json();
      return data.urls || [];
    },
    onSuccess: (data) => {
      toast({
        title: "Tải lên thành công",
        description: `${requestCertifications.length} tệp đã được tải lên`,
        variant: "default",
      });
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Tải lên thất bại",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Teaching request submission mutation
  const teachingRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(
        "POST",
        `/api/v1/tutors/teaching-requests`,
        data
      );
      return res.json();
    }, onSuccess: () => {
      setTeachingRequestDialogOpen(false);
      setRequestCertifications([]);
      teachingRequestForm.reset();      // Invalidate các query liên quan để cập nhật dữ liệu
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/teaching-requests`] });

      // Đồng thời cập nhật thông tin profile của tutor nếu cần
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });

      toast({
        title: "Yêu cầu đã gửi thành công",
        description: "Yêu cầu giảng dạy của bạn đã được gửi và đang chờ duyệt",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Gửi yêu cầu thất bại",
        description: error instanceof Error ? error.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    },
  });

  // Submit handler for profile form
  const onSubmit = async (values: z.infer<typeof tutorProfileSchema>) => {
    // Chỉ cập nhật thông tin cơ bản
    try {
      await updateProfileMutation.mutateAsync(values);
    } catch (error) {
      console.error("Lỗi khi cập nhật hồ sơ:", error);
    }
  };

  // Submit teaching request handler
  const onSubmitTeachingRequest = async (values: z.infer<typeof teachingRequestSchema>) => {
    try {
      // First, upload certifications if any
      let certificationUrls: string[] = [];
      if (requestCertifications.length > 0) {
        setUploadingCertifications(true);
        try {
          const result = await certificationsUploadMutation.mutateAsync(requestCertifications);
          certificationUrls = result;
        } finally {
          setUploadingCertifications(false);
        }
      }

      // Then submit the teaching request with the certification URLs
      await teachingRequestMutation.mutateAsync({
        subject_id: parseInt(values.subject_id),
        level_id: parseInt(values.level_id),
        introduction: values.introduction,
        experience: values.experience,
        certifications: certificationUrls.length > 0 ? JSON.stringify(certificationUrls) : null,
      });
    } catch (error) {
      console.error("Lỗi khi gửi yêu cầu giảng dạy:", error);
    }
  };
  // Tải profile và thiết lập form
  useEffect(() => {
    if (tutorProfile) {
      console.log("Nhận dữ liệu profile:", tutorProfile);

      // Cập nhật form với dữ liệu
      profileForm.setValue("bio", tutorProfile.bio || "");
      profileForm.setValue("date_of_birth", tutorProfile.date_of_birth || "");
      profileForm.setValue("address", tutorProfile.address || "");

      // Thêm dữ liệu user vào form
      if (user) {
        profileForm.setValue("first_name", user.first_name || "");
        profileForm.setValue("last_name", user.last_name || "");
        profileForm.setValue("phone", user.phone || "");
      }
    }
  }, [tutorProfile, profileForm, user]);

  // Cleanup avatar preview URL khi component unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

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
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8">                <div className="flex-shrink-0">
                <div className="relative">
                  <Avatar className={`h-32 w-32 border-2 ${uploadingAvatar ? 'border-warning animate-pulse' : 'border-primary'}`}>
                    <AvatarImage
                      src={user?.avatar ?? undefined}
                      alt={user?.first_name ?? ""}
                      className={`transition-opacity duration-300 ${uploadingAvatar ? 'opacity-50' : ''}`}
                    />
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    <AvatarFallback className="text-3xl">
                      {user?.first_name?.[0]}
                      {user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="mt-4">
                    <label className="block mb-2 text-sm font-medium">
                      Cập nhật ảnh đại diện
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="avatar-upload"
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="flex items-center px-3 py-2 text-sm border rounded cursor-pointer bg-background hover:bg-muted transition-colors"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Chọn ảnh
                      </label>

                      {avatar && (
                        <Button
                          onClick={handleAvatarUpload}
                          disabled={uploadingAvatar}
                          size="sm"
                        >
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang tải lên...
                            </>
                          ) : (
                            "Tải lên"
                          )}
                        </Button>
                      )}
                    </div>                      {avatar && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          {avatar.name} ({(avatar.size / 1024).toFixed(1)} KB)
                        </p>
                        {avatarPreview && (
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
                            <img
                              src={avatarPreview}
                              alt="Avatar preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                        {tutorProfile?.is_verified ? (
                          <>
                            <BadgeCheck className="h-4 w-4 text-success mr-1" />
                            <span className="text-success">Đã xác minh</span>
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
                      <div className="flex items-center">                        <Star className="h-4 w-4 text-warning fill-warning mr-1" />
                        <span>
                          {tutorProfile?.rating} ({tutorProfile?.total_reviews}{" "}
                          đánh giá)
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Ngày sinh
                      </h3>
                      <p className="text-base">
                        {tutorProfile?.date_of_birth
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
                        {tutorProfile?.address || "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-4">
                    <Button
                      variant="outline"
                      className="flex items-center"
                      onClick={() => setProfileDialogOpen(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Chỉnh sửa thông tin
                    </Button>

                    <Button
                      variant="secondary"
                      className="flex items-center"
                      onClick={() => setTeachingRequestDialogOpen(true)}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Yêu cầu giảng dạy
                    </Button>
                  </div>
                </div>
              </div>

              {!tutorProfile && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Chưa có hồ sơ</AlertTitle>
                  <AlertDescription>
                    Bạn chưa tạo hồ sơ gia sư. Hãy tạo hồ sơ để bắt đầu nhận yêu
                    cầu từ học sinh.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Details - Only showing bio now */}
        {tutorProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Giới thiệu bản thân</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{tutorProfile.bio}</p>
            </CardContent>
          </Card>
        )}        {/* Teaching Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>Yêu cầu giảng dạy</CardTitle>
            <CardDescription>
              Danh sách các yêu cầu giảng dạy của bạn và trạng thái phê duyệt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeachingRequestsList
              onCreateRequest={() => setTeachingRequestDialogOpen(true)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Profile Dialog - Simplified with only basic fields */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {tutorProfile ? "Chỉnh sửa hồ sơ" : "Tạo hồ sơ"}
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cơ bản trong hồ sơ gia sư của bạn
            </DialogDescription>
          </DialogHeader>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tên của bạn"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Họ của bạn"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Số điện thoại của bạn"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Số điện thoại để liên hệ khi cần thiết
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giới thiệu bản thân</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Giới thiệu về bản thân, kinh nghiệm giảng dạy..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Mô tả ngắn gọn về kinh nghiệm, chuyên môn của bạn
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày sinh</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        placeholder="DD/MM/YYYY"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Điền ngày sinh của bạn</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Địa chỉ liên hệ của bạn..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Thông tin sẽ chỉ được chia sẻ khi có nhu cầu liên hệ
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={profileForm.formState.isSubmitting}
                >
                  {profileForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {tutorProfile ? "Cập nhật hồ sơ" : "Tạo hồ sơ"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Teaching Request Dialog - New dialog for creating requests */}
      <Dialog open={teachingRequestDialogOpen} onOpenChange={setTeachingRequestDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu dạy học</DialogTitle>
            <DialogDescription>
              Điền thông tin chi tiết về yêu cầu dạy học của bạn
            </DialogDescription>
          </DialogHeader>
          <Form {...teachingRequestForm}>
            <form
              onSubmit={teachingRequestForm.handleSubmit(onSubmitTeachingRequest)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={teachingRequestForm.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Môn học</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn môn học" />
                            </SelectTrigger>
                          </FormControl>                          <SelectContent>
                            {subjects.length === 0 ? (
                              <SelectItem value="no_subjects" disabled>
                                Không có môn học nào
                              </SelectItem>
                            ) : (
                              subjects.map((subject) => (
                                <SelectItem key={subject.id} value={`${subject.id}`}>
                                  {subject.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={teachingRequestForm.control}
                  name="level_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cấp độ</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn cấp độ" />
                            </SelectTrigger>
                          </FormControl>                          <SelectContent>
                            {educationLevels.length === 0 ? (
                              <SelectItem value="no_levels" disabled>
                                Không có cấp độ nào
                              </SelectItem>
                            ) : (
                              educationLevels.map((level) => (
                                <SelectItem key={level.id} value={`${level.id}`}>
                                  {level.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={teachingRequestForm.control}
                  name="introduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới thiệu bản thân</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Giới thiệu về bản thân, kinh nghiệm giảng dạy..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={teachingRequestForm.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kinh nghiệm giảng dạy</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Nội dung thêm về yêu cầu dạy học của bạn..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel className="block mb-2">Chứng chỉ</FormLabel>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        id="certification-upload"
                        multiple
                        onChange={handleCertificationsChange}
                      />
                      <label
                        htmlFor="certification-upload"
                        className="flex items-center px-3 py-2 text-sm border rounded cursor-pointer bg-background hover:bg-muted transition-colors"
                      >
                        <FileCheck className="mr-2 h-4 w-4" />
                        Chọn tệp chứng chỉ
                      </label>

                      {uploadingCertifications && (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm">Đang tải lên...</span>
                        </div>
                      )}
                    </div>

                    {requestCertifications.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {requestCertifications.length} tệp đã chọn:
                        </p>
                        <ul className="text-sm text-muted-foreground">
                          {requestCertifications.map((file, index) => (
                            <li key={index}>
                              {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={teachingRequestForm.formState.isSubmitting}
                >
                  {teachingRequestForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Gửi yêu cầu
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TutorDashboardLayout>
  );
}
