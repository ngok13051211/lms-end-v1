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
  FileText,
  X as IconX,
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
  subject_id: z.coerce.number().min(1, "Vui lòng chọn môn học"),
  level_id: z.coerce.number().min(1, "Vui lòng chọn cấp độ"),
  introduction: z.string().min(10, "Giới thiệu phải có ít nhất 10 ký tự"),
  experience: z.string().min(10, "Kinh nghiệm phải có ít nhất 10 ký tự"),
  certifications: z
    .array(z.string())
    .min(1, "Vui lòng tải lên ít nhất 1 chứng chỉ"),
});

// Helper function to extract file name from URL
const getFileNameFromUrl = (url: string): string => {
  try {
    // Extract the last part of the URL path
    const pathname = new URL(url).pathname;
    let filename = pathname.split("/").pop() || "";

    // Remove any query parameters
    filename = filename.split("?")[0];

    // If filename has a weird format (like from Cloudinary), try to make it more readable
    if (filename.includes("_") && filename.length > 20) {
      return `Certificate ${Math.floor(Math.random() * 1000)}`;
    }

    return decodeURIComponent(filename);
  } catch {
    return `Certificate ${Math.floor(Math.random() * 1000)}`;
  }
};

export default function TutorDashboardProfile() {
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false); // Teaching request state
  const [teachingRequestDialogOpen, setTeachingRequestDialogOpen] =
    useState(false);
  const [requestCertifications, setRequestCertifications] = useState<File[]>(
    []
  );
  const [uploadingCertifications, setUploadingCertifications] = useState(false);
  const [certificateUrls, setCertificateUrls] = useState<string[]>([]);
  const [requestWarnings, setRequestWarnings] = useState<string[]>([]);
  const [requestExists, setRequestExists] = useState<boolean>(false);
  // Reset certificate state when dialog closes
  const handleTeachingRequestDialogChange = (open: boolean) => {
    console.log("Dialog thay đổi trạng thái:", open);

    // Nếu đang tải lên chứng chỉ và người dùng cố đóng dialog
    if (!open && uploadingCertifications) {
      toast({
        title: "Đang tải lên chứng chỉ",
        description: "Vui lòng đợi quá trình tải lên hoàn tất trước khi đóng",
        variant: "destructive",
      });
      return; // Không cho phép đóng dialog
    }

    setTeachingRequestDialogOpen(open);

    if (!open) {
      console.log("Đóng dialog, xóa state chứng chỉ");
      // Reset all states when dialog closes
      setRequestCertifications([]);
      setCertificateUrls([]);
      setRequestWarnings([]);
      setRequestExists(false);

      // Reset form values
      teachingRequestForm.reset({
        subject_id: 0,
        level_id: 0,
        introduction: "",
        experience: "",
        certifications: [],
      });

      // Xóa dữ liệu trong localStorage khi đóng dialog
      try {
        localStorage.removeItem("temp_certificate_urls");
      } catch (e) {
        console.error("Lỗi khi xóa certificateUrls từ localStorage:", e);
      }
    } else {
      // Khi mở dialog, log ra trạng thái hiện tại
      console.log("Mở dialog, trạng thái certificateUrls:", certificateUrls);
    }
  };

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
  }); // Teaching request form
  const teachingRequestForm = useForm<z.infer<typeof teachingRequestSchema>>({
    resolver: zodResolver(teachingRequestSchema),
    defaultValues: {
      subject_id: 0,
      level_id: 0,
      introduction: "",
      experience: "",
      certifications: [],
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
  const handleCertificationsChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      console.log(
        "Files được chọn:",
        files.map((f) => ({ name: f.name, size: f.size }))
      );

      // Check if we would exceed the maximum allowed files (5)
      if (certificateUrls.length + files.length > 5) {
        toast({
          title: "Quá nhiều tệp",
          description: `Bạn chỉ có thể tải lên tối đa 5 chứng chỉ. Đã có ${certificateUrls.length} chứng chỉ.`,
          variant: "destructive",
        });
        return;
      }

      // Check file sizes
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      const oversizedFiles = files.filter((file) => file.size > maxSizeInBytes);
      if (oversizedFiles.length > 0) {
        toast({
          title: "Tệp quá lớn",
          description: `${oversizedFiles.length} tệp vượt quá giới hạn 5MB và không thể tải lên.`,
          variant: "destructive",
        });
        return;
      }

      // Xóa lỗi validation nếu đã có
      teachingRequestForm.clearErrors("certifications");

      setRequestCertifications((prev) => [...prev, ...files]);

      // Start upload immediately
      setUploadingCertifications(true);
      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("documents", file);
        });

        console.log("Đang gửi request upload chứng chỉ...");
        const res = await fetch("/api/v1/tutors/certifications", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("Upload lỗi:", errorData);
          throw new Error(errorData.message || "Không thể tải lên chứng chỉ");
        }
        const data = await res.json();
        // Truy cập URLs một cách chính xác dựa trên cấu trúc response từ server
        let uploadedUrls = [];



        if (data.urls && Array.isArray(data.urls)) {
          uploadedUrls = data.urls;
        } else if (data.certifications && Array.isArray(data.certifications)) {
          uploadedUrls = data.certifications;
        } else if (
          data.data &&
          data.data.urls &&
          Array.isArray(data.data.urls)
        ) {
          uploadedUrls = data.data.urls;
        } else {
          // Nếu không tìm thấy theo cấu trúc dự đoán, tìm kiếm bất kỳ trường nào là mảng URL
          for (const key in data) {
            if (
              Array.isArray(data[key]) &&
              data[key].length > 0 &&
              typeof data[key][0] === "string" &&
              data[key][0].startsWith("http")
            ) {
              console.log(`Tìm thấy mảng URL trong trường: ${key}`);
              uploadedUrls = data[key];
              break;
            }
          }
        }
        console.log("URLs trích xuất từ response:", uploadedUrls);

        // Add the new URLs to the existing ones
        setCertificateUrls((prev) => {
          const newUrls = [...prev, ...uploadedUrls];

          // Cập nhật giá trị vào form control
          teachingRequestForm.setValue("certifications", newUrls);

          // Xóa lỗi validation
          teachingRequestForm.clearErrors("certifications");

          if (newUrls.length > 0) {
            teachingRequestForm.clearErrors("certifications");
          }

          // Lưu vào localStorage để đảm bảo không mất dữ liệu
          try {
            localStorage.setItem(
              "temp_certificate_urls",
              JSON.stringify(newUrls)
            );
          } catch (e) {
            console.error("Không thể lưu vào localStorage:", e);
          }
          return newUrls;
        });

        toast({
          title: "Tải lên thành công",
          description: `${files.length} tệp đã được tải lên thành công`,
          variant: "default",
        });
      } catch (error) {
        console.error("Lỗi upload chi tiết:", error);
        toast({
          title: "Tải lên thất bại",
          description:
            error instanceof Error
              ? error.message
              : "Không thể tải lên chứng chỉ",
          variant: "destructive",
        });

        // Remove the files that failed to upload
        setRequestCertifications((prev) =>
          prev.filter(
            (prevFile) =>
              !files.some(
                (file) =>
                  file.name === prevFile.name && file.size === prevFile.size
              )
          )
        );
      } finally {
        setUploadingCertifications(false);
      }
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
    },
    onSuccess: (data) => {
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
    },
    onSuccess: (data) => {
      // Invalidate cả hồ sơ gia sư và thông tin user
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/auth/me`] }); // Cập nhật Redux store với thông tin mới
      if (data.data) {
        // Cập nhật thông tin user trong Redux store
        dispatch(
          updateUserProfile({
            first_name: data.data.first_name,
            last_name: data.data.last_name,
            phone: data.data.phone,
          })
        );
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
  // Certification upload mutation for teaching request - now used as a fallback if needed
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
      // Update our certificate URLs state
      const newUrls = data.urls || [];
      setCertificateUrls((prev) => [...prev, ...newUrls]);
      return newUrls;
    },
    onSuccess: (data) => {
      toast({
        title: "Tải lên thành công",
        description: `${data.length} tệp đã được tải lên`,
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
  }); // Teaching request submission mutation
  const teachingRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("teachingRequestMutation được gọi với data:", data);

      try {
        const res = await apiRequest(
          "POST",
          `/api/v1/tutors/teaching-requests`,
          data
        );

        // Lấy kết quả từ API bất kể response status
        const responseData = await res.json();

        // Xử lý trường hợp response không thành công nhưng không phải là do trùng lặp
        if (!res.ok && !responseData.warnings && !responseData.requestExists) {
          console.error("API trả về lỗi:", responseData);
          throw new Error(
            responseData.message || "Có lỗi xảy ra khi gửi yêu cầu"
          );
        }

        // Trả về dữ liệu response bất kể status code
        return {
          ...responseData,
          status: res.status,
          ok: res.ok,
        };
      } catch (error) {
        console.error("Lỗi khi gọi API teaching-requests:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Response từ API:", data);

      // Đặt lại trạng thái warnings và requestExists
      setRequestWarnings([]);
      setRequestExists(false);

      // Xử lý các cảnh báo nếu có
      if (data.warnings && data.warnings.length > 0) {
        // Cập nhật state warnings
        setRequestWarnings(data.warnings);

        // Hiển thị cảnh báo đầu tiên dưới dạng toast
        toast({
          title: "Lưu ý",
          description: data.warnings[0],
          variant: "warning", // Dùng warning thay vì destructive
        });
      }

      // Nếu có requestExists, không đóng dialog và không xóa dữ liệu
      if (data.requestExists) {
        // Cập nhật state requestExists
        setRequestExists(true);

        toast({
          title: "Thông báo",
          description: data.message || "Yêu cầu đã tồn tại",
          variant: "warning",
        });
        return;
      }

      // Nếu thành công thực sự (không có cảnh báo hoặc đã xử lý)
      setTeachingRequestDialogOpen(false);
      setRequestCertifications([]);
      setCertificateUrls([]);
      teachingRequestForm.reset();

      // Invalidate các query liên quan để cập nhật dữ liệu
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/tutors/teaching-requests`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });

      toast({
        title: "Yêu cầu đã gửi thành công",
        description:
          data.certificationsCount > 0
            ? `Yêu cầu giảng dạy của bạn với ${data.certificationsCount || 0
            } chứng chỉ đã được gửi và đang chờ duyệt`
            : "Yêu cầu giảng dạy của bạn đã được gửi và đang chờ duyệt",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Lỗi onError:", error);
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
  const onSubmitTeachingRequest = async (
    values: z.infer<typeof teachingRequestSchema>
  ) => {
    try {
      // Xóa trạng thái cảnh báo mỗi khi gửi form
      setRequestWarnings([]);
      setRequestExists(false);

      // Nếu đang tải lên chứng chỉ, không cho phép gửi
      if (uploadingCertifications) {
        toast({
          title: "Đang tải lên chứng chỉ",
          description:
            "Vui lòng đợi quá trình tải lên hoàn tất trước khi gửi yêu cầu",
          variant: "destructive",
        });
        return;
      }

      // Lấy danh sách chứng chỉ từ form values
      let currentCertificateUrls = values.certifications || [];

      // Nếu form đã báo lỗi validation cho certifications, hiển thị toast
      if (teachingRequestForm.formState.errors.certifications) {
        toast({
          title: "Thiếu chứng chỉ",
          description: "Vui lòng tải lên ít nhất 1 chứng chỉ để gửi yêu cầu",
          variant: "destructive",
        });
        return;
      }

      if (currentCertificateUrls.length === 0) {
        // Nếu không có chứng chỉ trong form, thử lấy từ state
        currentCertificateUrls = [...certificateUrls];

        // Nếu vẫn trống, thử lấy từ localStorage
        if (currentCertificateUrls.length === 0) {
          try {
            const savedUrls = localStorage.getItem("temp_certificate_urls");
            if (savedUrls) {
              const parsedUrls = JSON.parse(savedUrls);
              console.log(
                "Khôi phục certificateUrls từ localStorage:",
                parsedUrls
              );

              if (parsedUrls.length === 0) {
                // Hiển thị thông báo lỗi nếu không có chứng chỉ
                teachingRequestForm.setError("certifications", {
                  type: "manual",
                  message: "Vui lòng tải lên ít nhất 1 chứng chỉ",
                });

                toast({
                  title: "Thiếu chứng chỉ",
                  description:
                    "Vui lòng tải lên ít nhất 1 chứng chỉ để gửi yêu cầu",
                  variant: "destructive",
                });

                return;
              }

              currentCertificateUrls = parsedUrls;
              // Cập nhật lại state và form
              setCertificateUrls(parsedUrls);
              teachingRequestForm.setValue("certifications", parsedUrls);
            } else {
              // Hiển thị thông báo lỗi nếu không có chứng chỉ
              teachingRequestForm.setError("certifications", {
                type: "manual",
                message: "Vui lòng tải lên ít nhất 1 chứng chỉ",
              });

              toast({
                title: "Thiếu chứng chỉ",
                description:
                  "Vui lòng tải lên ít nhất 1 chứng chỉ để gửi yêu cầu",
                variant: "destructive",
              });

              return;
            }
          } catch (e) {
            console.error("Lỗi khi đọc từ localStorage:", e);

            // Hiển thị thông báo lỗi
            teachingRequestForm.setError("certifications", {
              type: "manual",
              message: "Vui lòng tải lên ít nhất 1 chứng chỉ",
            });

            return;
          }
        }
      }

      // Tạo payload - không cần parseInt vì schema đã xử lý coerce.number()
      const payload = {
        subject_id: values.subject_id,
        level_id: values.level_id,
        introduction: values.introduction,
        experience: values.experience,
        certifications:
          currentCertificateUrls.length > 0
            ? JSON.stringify(currentCertificateUrls)
            : JSON.stringify([]), // Luôn gửi mảng rỗng dưới dạng JSON, không gửi null
      };

      console.log("Payload gửi đi:", payload);
      console.log("Các chứng chỉ gửi kèm:", currentCertificateUrls);

      // Hiển thị xác nhận
      if (currentCertificateUrls.length > 0) {
        toast({
          title: "Đang gửi yêu cầu",
          description: `Gửi yêu cầu với ${currentCertificateUrls.length} chứng chỉ đã tải lên`,
          variant: "default",
        });
      }

      // Submit the teaching request with the certification URLs
      const result = await teachingRequestMutation.mutateAsync(payload);
      console.log("Kết quả gửi yêu cầu:", result);

      // Xóa dữ liệu localStorage sau khi gửi thành công
      localStorage.removeItem("temp_certificate_urls");
    } catch (error) {
      console.error("Lỗi khi gửi yêu cầu giảng dạy:", error);
      if (error instanceof Error) {
        toast({
          title: "Lỗi khi gửi yêu cầu",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Lỗi khi gửi yêu cầu",
          description: "Đã xảy ra lỗi không xác định",
          variant: "destructive",
        });
      }
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

  // Tự động điền thông tin từ Redux khi chưa có profile và mở dialog
  useEffect(() => {
    // Chỉ thực hiện khi dialog đang mở và chưa có hồ sơ
    if (profileDialogOpen && !tutorProfile && user) {
      console.log("Tự động điền thông tin từ user vào form");
      profileForm.setValue("first_name", user.first_name || "");
      profileForm.setValue("last_name", user.last_name || "");
      profileForm.setValue("phone", user.phone || "");
    }
  }, [profileDialogOpen, tutorProfile, user, profileForm]);

  // Theo dõi thay đổi của certificateUrls
  useEffect(() => {
    console.log("certificateUrls đã thay đổi:", certificateUrls);
  }, [certificateUrls]); // Khôi phục certificateUrls từ localStorage khi component mount
  useEffect(() => {
    // Chỉ thực hiện khi dialog mở để tránh ghi đè state khi không cần thiết
    if (teachingRequestDialogOpen) {
      try {
        const savedUrls = localStorage.getItem("temp_certificate_urls");
        if (savedUrls) {
          const parsedUrls = JSON.parse(savedUrls);
          console.log("Khôi phục certificateUrls từ localStorage:", parsedUrls);

          // Cập nhật cả state và form
          setCertificateUrls(parsedUrls);
          teachingRequestForm.setValue("certifications", parsedUrls);

          // Clear form error if we have certificates
          if (parsedUrls.length > 0) {
            teachingRequestForm.clearErrors("certifications");
          }
        }
      } catch (e) {
        console.error("Lỗi khi khôi phục certificateUrls từ localStorage:", e);
      }
    }
  }, [teachingRequestDialogOpen, teachingRequestForm]);

  // Cleanup avatar preview URL khi component unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);
  // Function to handle certificate removal
  const handleRemoveCertificate = (urlToRemove: string) => {
    setCertificateUrls((prev) => {
      const updatedUrls = prev.filter((url) => url !== urlToRemove);

      // Cập nhật giá trị vào form control
      teachingRequestForm.setValue("certifications", updatedUrls);

      // Xóa lỗi cũ (nếu có) và để validation xử lý khi submit
      if (updatedUrls.length === 0) {
        toast({
          title: "Đã xóa chứng chỉ",
          description:
            "Bạn cần tải lên ít nhất 1 chứng chỉ trước khi gửi yêu cầu",
        });
      } else {
        toast({
          title: "Đã xóa chứng chỉ",
          description: `Còn ${updatedUrls.length} chứng chỉ trong danh sách`,
        });
      }

      // Cập nhật localStorage
      try {
        localStorage.setItem(
          "temp_certificate_urls",
          JSON.stringify(updatedUrls)
        );
      } catch (e) {
        console.error("Không thể lưu vào localStorage:", e);
      }

      return updatedUrls;
    });
  };

  if (profileLoading) {
    return (
      <TutorDashboardLayout activePage="profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
              <div className="flex flex-col md:flex-row gap-8">
                {" "}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <Avatar
                      className={`h-32 w-32 border-2 ${uploadingAvatar
                        ? "border-warning animate-pulse"
                        : "border-primary"
                        }`}
                    >
                      <AvatarImage
                        src={user?.avatar ?? undefined}
                        alt={user?.first_name ?? ""}
                        className={`transition-opacity duration-300 ${uploadingAvatar ? "opacity-50" : ""
                          }`}
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
                      </div>{" "}
                      {avatar && (
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

                    <div>                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Đánh giá
                    </h3>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-warning fill-warning mr-1" />
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
                    </Button>                    <Button
                      variant="secondary"
                      className="flex items-center"
                      onClick={() => {
                        if (!tutorProfile) {
                          toast({
                            title: "Chưa có hồ sơ gia sư",
                            description: "Vui lòng tạo hồ sơ của bạn trước khi gửi yêu cầu giảng dạy",
                            variant: "destructive",
                          });
                          return;
                        }
                        setTeachingRequestDialogOpen(true);
                      }}
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
        )}{" "}
        {/* Teaching Requests List */}
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
            <form
              onSubmit={profileForm.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên</FormLabel>
                      <FormControl>
                        <Input placeholder="Tên của bạn" {...field} />
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
                        <Input placeholder="Họ của bạn" {...field} />
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
                      <Input placeholder="Số điện thoại của bạn" {...field} />
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
                      <Input type="date" placeholder="DD/MM/YYYY" {...field} />
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
      </Dialog>{" "}
      {/* Teaching Request Dialog - New dialog for creating requests */}{" "}
      <Dialog
        open={teachingRequestDialogOpen}
        onOpenChange={handleTeachingRequestDialogChange}
      >
        <DialogContent className="sm:max-w-[600px]">
          {" "}
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu dạy học</DialogTitle>
            <DialogDescription>
              Điền thông tin chi tiết về yêu cầu dạy học của bạn
            </DialogDescription>
          </DialogHeader>
          <Form {...teachingRequestForm}>
            <form
              onSubmit={teachingRequestForm.handleSubmit(
                onSubmitTeachingRequest
              )}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={teachingRequestForm.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      {" "}
                      <FormLabel>Môn học</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          defaultValue={field.value ? String(field.value) : ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn môn học" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.length === 0 ? (
                              <SelectItem value="no_subjects" disabled>
                                Không có môn học nào
                              </SelectItem>
                            ) : (
                              subjects.map((subject) => (
                                <SelectItem
                                  key={subject.id}
                                  value={String(subject.id)}
                                >
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
                      {" "}
                      <FormLabel>Cấp độ</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          defaultValue={field.value ? String(field.value) : ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cấp độ" />
                          </SelectTrigger>
                          <SelectContent>
                            {educationLevels.length === 0 ? (
                              <SelectItem value="no_levels" disabled>
                                Không có cấp độ nào
                              </SelectItem>
                            ) : (
                              educationLevels.map((level) => (
                                <SelectItem
                                  key={level.id}
                                  value={String(level.id)}
                                >
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
                />{" "}
                <FormField
                  control={teachingRequestForm.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <span>Chứng chỉ</span>
                          <span className="text-red-500 ml-1 text-lg">*</span>
                          {certificateUrls.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center">
                              <BadgeCheck className="h-3 w-3 mr-1" />
                              {certificateUrls.length} chứng chỉ
                            </span>
                          )}
                        </FormLabel>
                      </div>{" "}
                      <FormControl>
                        <div className="w-full">
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
                                className={`flex items-center px-4 py-2.5 text-sm border-2 rounded-md cursor-pointer transition-all duration-200 
                                  ${uploadingCertifications
                                    ? "opacity-50 pointer-events-none bg-muted"
                                    : "border-primary bg-primary/5 hover:bg-primary/10 text-primary hover:shadow-sm"
                                  }`}
                              >
                                {uploadingCertifications ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="mr-2 h-4 w-4" />
                                )}
                                {uploadingCertifications
                                  ? "Đang tải lên..."
                                  : certificateUrls.length === 0
                                    ? "Tải lên chứng chỉ"
                                    : "Thêm chứng chỉ khác"}
                              </label>

                              {uploadingCertifications && (
                                <div className="flex items-center text-amber-500">
                                  <span className="text-sm">
                                    Đang tải lên, vui lòng đợi...
                                  </span>
                                </div>
                              )}
                            </div>

                            {(requestCertifications.length > 0 ||
                              certificateUrls.length > 0) && (
                                <div className="space-y-3 mt-2">
                                  {requestCertifications.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium mb-1">
                                        Tệp đã chọn:
                                      </p>
                                      <ul className="space-y-1 text-sm text-muted-foreground">
                                        {requestCertifications.map(
                                          (file, index) => (
                                            <li
                                              key={index}
                                              className="flex items-center justify-between"
                                            >
                                              <span className="flex items-center">
                                                <FileCheck className="h-3 w-3 mr-1" />
                                                {file.name} (
                                                {(file.size / 1024).toFixed(1)}{" "}
                                                KB)
                                              </span>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                  {certificateUrls.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium mb-1 flex items-center">
                                        <BadgeCheck className="h-4 w-4 text-green-600 mr-1" />
                                        Đã tải lên thành công (
                                        {certificateUrls.length}):
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {certificateUrls.map((url, index) => {
                                          const fileName =
                                            getFileNameFromUrl(url);
                                          const isPdf = fileName
                                            .toLowerCase()
                                            .endsWith(".pdf");
                                          return (
                                            <div
                                              key={index}
                                              className="flex items-center gap-1"
                                            >
                                              <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center px-3 py-1 text-xs rounded bg-background hover:bg-accent transition-colors border"
                                              >
                                                {isPdf ? (
                                                  <FileText className="h-3 w-3 mr-1 text-blue-500" />
                                                ) : (
                                                  <FileCheck className="h-3 w-3 mr-1 text-green-500" />
                                                )}
                                                {fileName.length > 20
                                                  ? fileName.substring(0, 17) +
                                                  "..."
                                                  : fileName}
                                              </a>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRemoveCertificate(url)
                                                }
                                                className="p-1 rounded-full hover:bg-red-100 text-red-500"
                                                title="Xóa chứng chỉ"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="12"
                                                  height="12"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                >
                                                  <path d="M18 6 6 18"></path>
                                                  <path d="m6 6 12 12"></path>
                                                </svg>
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="mt-3 border-t pt-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center">
                            <FileCheck className="h-4 w-4 mr-2 text-primary" />
                            <span className="font-medium text-primary">
                              Yêu cầu chứng chỉ:
                            </span>
                          </div>
                          <ul className="list-disc pl-5 space-y-1.5 text-sm">
                            <li>
                              <span className="font-medium">Định dạng:</span> Hỗ
                              trợ hình ảnh (JPG, PNG) và PDF
                            </li>
                            <li>
                              <span className="font-medium">Số lượng:</span>{" "}
                              <span className="text-destructive font-medium">
                                Tối thiểu 1 chứng chỉ
                              </span>
                              , tối đa 5 tệp
                            </li>
                            <li>
                              <span className="font-medium">Kích thước:</span>{" "}
                              Mỗi tệp không quá 5MB
                            </li>
                          </ul>
                        </div>
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>{" "}
              <DialogFooter className="flex flex-col items-start sm:flex-row sm:justify-between sm:space-x-2">
                <Button
                  type="submit"
                  className={
                    requestExists ? "bg-amber-500 hover:bg-amber-600" : ""
                  }
                  disabled={
                    teachingRequestForm.formState.isSubmitting ||
                    uploadingCertifications
                  }
                >
                  {(teachingRequestForm.formState.isSubmitting ||
                    uploadingCertifications) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                  {uploadingCertifications
                    ? "Đang tải lên chứng chỉ..."
                    : requestExists
                      ? "Gửi lại yêu cầu"
                      : "Gửi yêu cầu"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TutorDashboardLayout>
  );
}
