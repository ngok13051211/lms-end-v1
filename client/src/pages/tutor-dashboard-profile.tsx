import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  Edit,
  Upload,
  AlertCircle,
  UserCircle,
  BadgeCheck,
  FileText,
  ExternalLink,
  Trash,
  Calendar as CalendarIcon,
  Book,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

// Định nghĩa cấu trúc cho khung giờ trống theo ngày cụ thể
const specificDateAvailabilityItemSchema = z.object({
  type: z.literal("specific"),
  date: z.string(), // Format: "YYYY-MM-DD"
  startTime: z.string(), // Format: "HH:MM" in 24h
  endTime: z.string(), // Format: "HH:MM" in 24h
});

// Định nghĩa cấu trúc cho lịch trống
const availabilityItemSchema = specificDateAvailabilityItemSchema;

// Định nghĩa kiểu dữ liệu cho một khung giờ trống (ngày cụ thể)
export type AvailabilityItem = {
  type: "specific";
  date: string; // Ngày ở định dạng YYYY-MM-DD
  startTime: string; // Thời gian ở định dạng HH:MM
  endTime: string; // Thời gian ở định dạng HH:MM
};

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

// Hàm kiểm tra hai khung giờ có chồng lấn nhau không
// Hàm định dạng giá tiền
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const isTimeSlotOverlapping = (
  slot1: AvailabilityItem,
  slot2: AvailabilityItem
): boolean => {
  if (slot1.date !== slot2.date) return false;
  
  const startTime1 = slot1.startTime;
  const endTime1 = slot1.endTime;
  const startTime2 = slot2.startTime;
  const endTime2 = slot2.endTime;
  
  // Kiểm tra có chồng lấn không
  return (
    (startTime1 < endTime2 && endTime1 > startTime2) ||
    (startTime2 < endTime1 && endTime2 > startTime1)
  );
};

export default function TutorDashboardProfile() {
  const { toast } = useToast();
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [certifications, setCertifications] = useState<File[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCertifications, setUploadingCertifications] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [subjectsDialogOpen, setSubjectsDialogOpen] = useState(false);

  // Khung giờ trống
  const [availabilityItems, setAvailabilityItems] = useState<AvailabilityItem[]>([]);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);

  // State cho khung giờ trống mới (chỉ có ngày cụ thể)
  const [newAvailabilityItem, setNewAvailabilityItem] = useState<AvailabilityItem>({
    type: "specific",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "08:00",
    endTime: "17:00",
  });

  // Get tutor profile
  const {
    data: tutorProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchTutorProfile,
  } = useQuery<any>({
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

  // Setup profile form
  const profileForm = useForm<z.infer<typeof tutorProfileSchema>>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      bio: "",
      date_of_birth: "",
      address: "",
    },
  });

  // Handle file change for avatar upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatar(e.target.files[0]);
    }
  };

  // Handle certification file change
  const handleCertificationsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setCertifications(files);
    }
  };

  // Certifications upload mutation
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
          // No Content-Type header needed as FormData sets it automatically
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to upload certifications");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Uploaded certifications",
        description: `${certifications.length} file(s) uploaded successfully`,
        variant: "default",
      });
      setCertifications([]);
      refetchTutorProfile();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle certifications upload
  const handleCertificationsUpload = async () => {
    if (certifications.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploadingCertifications(true);
    try {
      await certificationsUploadMutation.mutateAsync(certifications);
    } finally {
      setUploadingCertifications(false);
    }
  };

  // Avatar upload mutation
  const avatarUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // API call to upload avatar
      const res = await fetch("/api/v1/users/avatar", {
        method: "POST",
        body: formData,
        headers: {
          // No Content-Type header needed as FormData sets it automatically
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to upload avatar");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated",
        variant: "default",
      });
      setAvatar(null);
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
        title: "No file selected",
        description: "Please select a file to upload",
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
      // Gửi tất cả dữ liệu từ form
      const profileData = {
        bio: data.bio,
        date_of_birth: data.date_of_birth,
        address: data.address
      };

      console.log("Updating profile with:", profileData);

      const res = await apiRequest("PATCH", `/api/v1/tutors/profile`, profileData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
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
          error instanceof Error
            ? error.message
            : "Không thể cập nhật hồ sơ",
        variant: "destructive",
      });
    },
  });

  // Subject update mutation
  const updateSubjectsMutation = useMutation({
    mutationFn: async (subjectIds: string[]) => {
      const res = await apiRequest("PATCH", `/api/v1/tutors/profile`, {
        subject_ids: subjectIds,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Môn học đã được cập nhật",
        description: "Danh sách môn học của bạn đã được cập nhật thành công",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
    },
    onError: (error) => {
      toast({
        title: "Cập nhật thất bại",
        description: error instanceof Error ? error.message : "Không thể cập nhật môn học",
        variant: "destructive",
      });
    },
  });

  // Handle subjects update
  const handleSubjectsUpdate = () => {
    updateSubjectsMutation.mutate(selectedSubjects);
  };

  // Submit handler for profile form
  const onSubmit = async (values: z.infer<typeof tutorProfileSchema>) => {
    // Cập nhật profile
    const updateProfilePromise = updateProfileMutation.mutateAsync(values);
    
    // Cập nhật môn học
    const updateSubjectsPromise = selectedSubjects.length > 0 
      ? updateSubjectsMutation.mutateAsync(selectedSubjects)
      : Promise.resolve();
    
    // Tải lên chứng chỉ nếu có chọn file
    const uploadCertificationsPromise = certifications.length > 0
      ? certificationsUploadMutation.mutateAsync(certifications)
      : Promise.resolve();
    
    try {
      await Promise.all([
        updateProfilePromise, 
        updateSubjectsPromise,
        uploadCertificationsPromise
      ]);
      
      // Xóa danh sách file đã chọn sau khi tải lên thành công
      if (certifications.length > 0) {
        setCertifications([]);
      }
      
      toast({
        title: "Hồ sơ đã được cập nhật",
        description: "Thông tin hồ sơ và các dữ liệu liên quan đã được cập nhật thành công",
        variant: "default",
      });
      
      // Đóng dialog
      setProfileDialogOpen(false);
    } catch (error) {
      console.error("Lỗi khi cập nhật hồ sơ:", error);
      // Toast thông báo lỗi được xử lý bởi các mutation
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
      
      // Vẫn giữ lại thông tin về subjects và levels để hiển thị
      const subjectIds =
        tutorProfile.subjects?.map((subject: any) => String(subject.id)) || [];
      setSelectedSubjects(subjectIds);

      // Xử lý levels cho hiển thị
      const levelIds =
        tutorProfile.levels?.map((level: any) => String(level.id)) || [];
      setSelectedLevels(levelIds);

      // Vẫn giữ xử lý lịch trống cho hiển thị (không cần chỉnh sửa)
      if (tutorProfile.availability) {
        try {
          // Parse JSON string thành đối tượng JavaScript
          const parsedAvailability = JSON.parse(tutorProfile.availability);
          console.log("Dữ liệu lịch trống thô:", parsedAvailability);

          // Đảm bảo dữ liệu đúng định dạng
          if (Array.isArray(parsedAvailability)) {
            const convertedItems: AvailabilityItem[] = [];

            // Xử lý dữ liệu lịch trống
            for (const item of parsedAvailability) {
              // Nếu là lịch ngày cụ thể
              if (item.type === "specific" && item.date) {
                // Chuẩn hóa thời gian
                let startTime = item.startTime || "08:00";
                if (startTime.length === 4) {
                  startTime = "0" + startTime;
                }

                let endTime = item.endTime || "17:00";
                if (endTime.length === 4) {
                  endTime = "0" + endTime;
                }

                convertedItems.push({
                  type: "specific",
                  date: item.date,
                  startTime,
                  endTime,
                });
                continue;
              }
              
              // Nếu là weekly hoặc không có type nhưng có day, bỏ qua
              if (item.type === "weekly" || (!item.type && item.day)) {
                console.log("Bỏ qua lịch trống theo tuần:", item);
                continue;
              }
              
              // Nếu là data cũ không có type nhưng có date, chuyển thành specific
              if (!item.type && item.date) {
                // Chuẩn hóa thời gian
                let startTime = item.startTime || "08:00";
                if (startTime.length === 4) {
                  startTime = "0" + startTime;
                }

                let endTime = item.endTime || "17:00";
                if (endTime.length === 4) {
                  endTime = "0" + endTime;
                }
                
                convertedItems.push({
                  type: "specific",
                  date: item.date,
                  startTime,
                  endTime,
                });
              }
            }

            console.log("Dữ liệu lịch trống đã chuyển đổi:", convertedItems);
            setAvailabilityItems(convertedItems);
          } else {
            console.warn(
              "Dữ liệu lịch trống không phải mảng:",
              parsedAvailability,
            );
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
      // Sử dụng kiểu AvailabilityItem mới (chỉ ngày cụ thể)
      // Tuy nhiên vẫn chuẩn hóa để tương thích với backend cũ
      const normalizedData = availabilityData
        .map((item) => {
          // Chuẩn hóa thời gian
          let startTime = item.startTime;
          if (startTime.length === 4) {
            // Nếu là H:MM
            startTime = "0" + startTime;
          }

          let endTime = item.endTime;
          if (endTime.length === 4) {
            // Nếu là H:MM
            endTime = "0" + endTime;
          }

          // Đảm bảo định dạng ngày
          let date = item.date;

          // Trả về object với cả type để phân biệt
          return {
            type: "specific", // Lưu loại lịch
            date,
            startTime,
            endTime,
          };
        })
        .filter(Boolean); // Remove any null values

      // Chuyển danh sách availability thành chuỗi JSON
      const availabilityJson = JSON.stringify(normalizedData);

      console.log("Cập nhật lịch trống:", availabilityJson);

      const res = await apiRequest("PATCH", `/api/v1/tutors/profile`, {
        availability: availabilityJson,
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
        description:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi cập nhật lịch trống.",
        variant: "destructive",
      });
    },
  });

  // Kiểm tra khung giờ trùng lặp (chỉ dùng cho ngày cụ thể)
  const checkTimeSlotOverlapping = (newSlot: AvailabilityItem) => {
    // Chỉ kiểm tra trùng lặp cho các lịch trống cùng ngày
    return availabilityItems.some((existingSlot) => {
      if (existingSlot.date === newSlot.date) {
        // Chuyển đổi giờ:phút thành số phút để dễ so sánh
        const [existingStartHour, existingStartMin] = existingSlot.startTime
          .split(":")
          .map(Number);
        const [existingEndHour, existingEndMin] = existingSlot.endTime
          .split(":")
          .map(Number);
        const [newStartHour, newStartMin] = newSlot.startTime
          .split(":")
          .map(Number);
        const [newEndHour, newEndMin] = newSlot.endTime
          .split(":")
          .map(Number);

        const existingStartMinutes =
          existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;
        const newStartMinutes = newStartHour * 60 + newStartMin;
        const newEndMinutes = newEndHour * 60 + newEndMin;

        // Kiểm tra xem hai khoảng thời gian có giao nhau không
        return (
          newStartMinutes < existingEndMinutes &&
          newEndMinutes > existingStartMinutes
        );
      }
      return false;
    });
  };

  // Kiểm tra thời gian (cả hàng tuần và ngày cụ thể)
  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes > startMinutes;
  };

  // Thêm lịch trống theo ngày cụ thể
  const handleAddAvailability = () => {
    // Chuẩn hóa định dạng giờ bắt đầu
    let startTime = newAvailabilityItem.startTime;
    if (startTime && startTime.length === 4) {
      startTime = "0" + startTime;
    }
    
    // Chuẩn hóa định dạng giờ kết thúc
    let endTime = newAvailabilityItem.endTime;
    if (endTime && endTime.length === 4) {
      endTime = "0" + endTime;
    }
    
    // Cập nhật giá trị đã chuẩn hóa
    const normalizedItem = {
      ...newAvailabilityItem,
      startTime,
      endTime
    };
    
    // Kiểm tra nếu thời gian kết thúc <= thời gian bắt đầu
    if (
      !validateTimeRange(
        normalizedItem.startTime,
        normalizedItem.endTime,
      )
    ) {
      toast({
        title: "Lỗi thời gian",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra xem đã có lịch trống cho ngày này chưa và có trùng lấp không
    if (checkTimeSlotOverlapping(normalizedItem)) {
      toast({
        title: "Lịch trùng lặp",
        description:
          "Đã có lịch cho ngày này trong cùng khung giờ. Vui lòng chọn thời gian khác.",
        variant: "destructive",
      });
      return;
    }

    // Nếu không có vấn đề gì, thêm khung giờ mới với giá trị đã chuẩn hóa
    setAvailabilityItems([...availabilityItems, normalizedItem]);

    // Reset form nhưng giữ lại date hiện tại và đặt thời gian mặc định
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setNewAvailabilityItem({
      type: "specific",
      date: format(tomorrow, "yyyy-MM-dd"),
      startTime: "08:00",
      endTime: "17:00",
    });
  };

  // Xóa một khung giờ trống
  const handleRemoveAvailability = (index: number) => {
    const newItems = [...availabilityItems];
    newItems.splice(index, 1);
    setAvailabilityItems(newItems);
  };

  // Xử lý lịch trùng lặp trước khi lưu (chỉ cho ngày cụ thể)
  const removeDuplicateTimeSlots = (
    slots: AvailabilityItem[],
  ): AvailabilityItem[] => {
    // Nhóm các khung giờ theo ngày
    const dateMaps: Record<string, AvailabilityItem[]> = {};

    // Lọc tất cả các slot là ngày cụ thể và nhóm chúng theo ngày
    slots.forEach((slot) => {
      // Chuẩn hóa định dạng thời gian để đảm bảo thống nhất (HH:MM)
      let startTime = slot.startTime;
      if (startTime && startTime.length === 4) {
        startTime = "0" + startTime;
      }
      
      let endTime = slot.endTime;
      if (endTime && endTime.length === 4) {
        endTime = "0" + endTime;
      }
      
      const normalizedSlot = {
        ...slot,
        startTime: startTime,
        endTime: endTime
      };
      
      if (!dateMaps[slot.date]) {
        dateMaps[slot.date] = [];
      }
      dateMaps[slot.date].push(normalizedSlot);
    });

    // Kết quả cuối cùng
    const result: AvailabilityItem[] = [];

    // Xử lý cho từng ngày
    Object.entries(dateMaps).forEach(([date, dateSlots]) => {
      // Sắp xếp các slot theo thời gian bắt đầu
      dateSlots.sort((a, b) => {
        const [aHour, aMin] = a.startTime.split(":").map(Number);
        const [bHour, bMin] = b.startTime.split(":").map(Number);

        const aMinutes = aHour * 60 + aMin;
        const bMinutes = bHour * 60 + bMin;

        return aMinutes - bMinutes;
      });

      // Kết hợp các khung giờ chồng lấp
      const mergedSlots: AvailabilityItem[] = [];

      for (const slot of dateSlots) {
        if (mergedSlots.length === 0) {
          mergedSlots.push(slot);
          continue;
        }

        const lastSlot = mergedSlots[mergedSlots.length - 1];

        // Chuyển đổi giờ:phút thành số phút để dễ so sánh
        const [lastStartHour, lastStartMin] = lastSlot.startTime
          .split(":")
          .map(Number);
        const [lastEndHour, lastEndMin] = lastSlot.endTime
          .split(":")
          .map(Number);
        const [currStartHour, currStartMin] = slot.startTime
          .split(":")
          .map(Number);
        const [currEndHour, currEndMin] = slot.endTime.split(":").map(Number);

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
            lastSlot.endTime = `${newEndHour.toString().padStart(2, "0")}:${newEndMin.toString().padStart(2, "0")}`;
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
    const cleanedAvailabilityItems =
      removeDuplicateTimeSlots(availabilityItems);

    // Cập nhật state để người dùng biết lịch đã được dọn dẹp
    if (
      JSON.stringify(cleanedAvailabilityItems) !==
      JSON.stringify(availabilityItems)
    ) {
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
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-2 border-primary">
                      <AvatarImage src={user?.avatar} alt={user?.first_name} />
                      <AvatarFallback className="text-3xl">
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
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
                      </div>
                      {avatar && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {avatar.name}
                        </p>
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
                            <span className="text-warning">Đang chờ xác minh</span>
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
                        <span>{tutorProfile?.rating} ({tutorProfile?.total_reviews} đánh giá)</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Ngày sinh
                      </h3>
                      <p className="text-base">
                        {tutorProfile?.date_of_birth ? new Date(tutorProfile.date_of_birth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Địa chỉ
                      </h3>
                      <p className="text-base">
                        {tutorProfile?.address || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setProfileDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {tutorProfile ? "Chỉnh sửa hồ sơ" : "Tạo hồ sơ"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {!tutorProfile && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Chưa có hồ sơ</AlertTitle>
                  <AlertDescription>
                    Bạn chưa tạo hồ sơ gia sư. Hãy tạo hồ sơ để bắt đầu nhận yêu cầu từ học sinh.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        {tutorProfile && (
          <>
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Giới thiệu bản thân</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{tutorProfile.bio}</p>
                </CardContent>
              </Card>
              
              {/* Card môn học */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Môn học giảng dạy</CardTitle>
                  <Button 
                    variant="outline" 
                    onClick={() => setSubjectsDialogOpen(true)}
                    className="ml-auto"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Cập nhật
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tutorProfile.subjects && tutorProfile.subjects.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {tutorProfile.subjects.map((subject: any) => (
                          <div
                            key={subject.id}
                            className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30"
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Book className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{subject.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg border-dashed">
                        <Book className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Bạn chưa chọn môn học nào để giảng dạy
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setSubjectsDialogOpen(true)}
                          className="mt-4"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Chọn môn học
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Chứng chỉ & Giấy tờ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Display existing certifications */}
                  {tutorProfile.certifications ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {JSON.parse(tutorProfile.certifications as string).map(
                        (cert: string, index: number) => (
                          <div
                            key={index}
                            className="border rounded-md overflow-hidden flex flex-col"
                          >
                            <div className="aspect-video bg-gray-100 relative">
                              <img
                                src={cert}
                                alt={`Certification ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="p-2 flex justify-between items-center">
                              <span className="text-sm font-medium truncate">
                                Certificate {index + 1}
                              </span>
                              <a
                                href={cert}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Chưa có chứng chỉ nào được tải lên
                    </p>
                  )}

                  {/* Upload certifications form */}
                  <div className="border rounded-md p-4 mt-4">
                    <h4 className="font-medium mb-4">Thêm chứng chỉ mới</h4>

                    <div>
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
                          onChange={handleCertificationsChange}
                          multiple
                        />
                      </label>

                      {certifications.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">
                            Đã chọn {certifications.length} file:
                          </p>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {certifications.map((file, index) => (
                              <li key={index}>{file.name}</li>
                            ))}
                          </ul>

                          <Button
                            onClick={handleCertificationsUpload}
                            className="mt-4"
                            disabled={uploadingCertifications}
                          >
                            {uploadingCertifications && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Upload Certifications
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Subjects Dialog */}
      <Dialog open={subjectsDialogOpen} onOpenChange={setSubjectsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn môn học giảng dạy</DialogTitle>
            <DialogDescription>
              Chọn các môn học bạn có thể giảng dạy cho học viên
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`subject-${subject.id}`} 
                    checked={selectedSubjects.includes(String(subject.id))} 
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        setSelectedSubjects([...selectedSubjects, String(subject.id)]);
                      } else {
                        setSelectedSubjects(
                          selectedSubjects.filter((id) => id !== String(subject.id))
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor={`subject-${subject.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {subject.name}
                  </label>
                </div>
              ))}
              
              {subjects.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Không có môn học nào để hiển thị
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSubjectsDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button 
              type="button"
              onClick={handleSubjectsUpdate}
              disabled={updateSubjectsMutation.isPending}
            >
              {updateSubjectsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lịch trống Dialog */}
      <Dialog
        open={availabilityDialogOpen}
        onOpenChange={setAvailabilityDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quản lý lịch trống</DialogTitle>
            <DialogDescription>
              Thiết lập thời gian bạn có thể dạy để học viên có thể đặt lịch với
              bạn
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
                      {/* Danh sách lịch theo ngày cụ thể */}
                      {availabilityItems.map((item, index) => {
                        return (
                          <div
                            key={`specific-${index}`}
                            className="flex items-center space-x-4 p-4 border rounded-md"
                          >
                            <div className="w-auto">
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200"
                              >
                                Ngày cụ thể
                              </Badge>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center space-x-2">
                                <Label>Ngày:</Label>
                                <Input
                                  type="date"
                                  value={item.date}
                                  min={format(new Date(), "yyyy-MM-dd")}
                                  onChange={(e) => {
                                    const newItems = [...availabilityItems];
                                    const itemIndex =
                                      availabilityItems.indexOf(item);
                                    if (itemIndex !== -1) {
                                      newItems[itemIndex].date =
                                        e.target.value;
                                      setAvailabilityItems(newItems);
                                    }
                                  }}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(
                                    item.date
                                      ? new Date(item.date)
                                      : new Date(),
                                    "EEEE",
                                    {
                                      locale: vi,
                                    },
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Label>Bắt đầu:</Label>
                                <Input
                                  type="time"
                                  value={item.startTime}
                                  onChange={(e) => {
                                    const newItems = [...availabilityItems];
                                    const itemIndex =
                                      availabilityItems.indexOf(item);
                                    if (itemIndex !== -1) {
                                      newItems[itemIndex].startTime =
                                        e.target.value;
                                      setAvailabilityItems(newItems);
                                    }
                                  }}
                                />
                              </div>

                              <div className="flex items-center space-x-2">
                                <Label>Kết thúc:</Label>
                                <Input
                                  type="time"
                                  value={item.endTime}
                                  onChange={(e) => {
                                    const newItems = [...availabilityItems];
                                    const itemIndex =
                                      availabilityItems.indexOf(item);
                                    if (itemIndex !== -1) {
                                      newItems[itemIndex].endTime =
                                        e.target.value;
                                      setAvailabilityItems(newItems);
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveAvailability(
                                  availabilityItems.indexOf(item),
                                )
                              }
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">
                        Chưa có lịch trống nào được thiết lập
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Thiết lập lịch trống để học viên có thể đặt lịch học với
                        bạn
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab thêm lịch trống mới */}
              <TabsContent value="add">
                <div className="space-y-4 py-2">
                  {/* Form thêm lịch trống ngày cụ thể */}
                  <div className="p-4 border rounded-md mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="specific-date">Ngày cụ thể</Label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className="w-full pl-9 text-left font-normal"
                                id="specific-date"
                              >
                                {newAvailabilityItem.date ? (
                                  format(
                                    parseISO(newAvailabilityItem.date),
                                    "EEEE, dd/MM/yyyy",
                                    { locale: vi }
                                  )
                                ) : (
                                  <span>Chọn ngày</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={newAvailabilityItem.date ? parseISO(newAvailabilityItem.date) : undefined}
                                onSelect={(date: Date | undefined) => {
                                  if (date) {
                                    setNewAvailabilityItem({
                                      ...newAvailabilityItem,
                                      date: format(date, "yyyy-MM-dd"),
                                    });
                                  }
                                }}
                                disabled={(date: Date) => {
                                  // Chỉ cho phép chọn ngày từ hôm nay trở đi
                                  return date < new Date();
                                }}
                                initialFocus
                                locale={vi}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="specific-start-time">
                          Thời gian bắt đầu
                        </Label>
                        <Input
                          id="specific-start-time"
                          type="time"
                          value={newAvailabilityItem.startTime}
                          onChange={(e) =>
                            setNewAvailabilityItem({
                              ...newAvailabilityItem,
                              startTime: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="specific-end-time">
                          Thời gian kết thúc
                        </Label>
                        <Input
                          id="specific-end-time"
                          type="time"
                          value={newAvailabilityItem.endTime}
                          onChange={(e) =>
                            setNewAvailabilityItem({
                              ...newAvailabilityItem,
                              endTime: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <Button
                      className="mt-4 w-full"
                      onClick={handleAddAvailability}
                    >
                      Thêm lịch trống
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAvailabilityDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitAvailability}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tutorProfile ? "Cập nhật hồ sơ" : "Tạo hồ sơ gia sư"}
            </DialogTitle>
            <DialogDescription>
              Điền thông tin dưới đây để tạo hồ sơ gia sư của bạn
            </DialogDescription>
          </DialogHeader>

          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onSubmit)}
              className="space-y-6 py-4"
            >
              <div className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới thiệu bản thân</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Giới thiệu bản thân cho học sinh tiềm năng..."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Tối thiểu 50 ký tự</FormDescription>
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
                      <FormDescription>Thông tin sẽ chỉ được chia sẻ khi có nhu cầu liên hệ</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Phần chọn môn học */}
                <div>
                  <Label className="text-base">Môn học giảng dạy</Label>
                  <div className="mt-2">
                    <div className="border rounded-md p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {subjects.map((subject) => (
                          <div key={subject.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`subject-select-${subject.id}`} 
                              checked={selectedSubjects.includes(String(subject.id))} 
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSubjects([...selectedSubjects, String(subject.id)]);
                                } else {
                                  setSelectedSubjects(
                                    selectedSubjects.filter((id) => id !== String(subject.id))
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
                      
                      {subjects.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          Không có môn học nào để hiển thị
                        </div>
                      )}
                    </div>
                    <FormDescription className="mt-1">Chọn môn học bạn có thể giảng dạy</FormDescription>
                  </div>
                </div>
                
                {/* Phần tải chứng chỉ */}
                <div>
                  <Label className="text-base">Chứng chỉ & Giấy tờ</Label>
                  <div className="mt-2">
                    <div className="border rounded-md p-4">
                      <label
                        htmlFor="certification-upload-form"
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
                          id="certification-upload-form"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleCertificationsChange}
                          multiple
                        />
                      </label>

                      {certifications.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">
                            Đã chọn {certifications.length} file:
                          </p>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {certifications.map((file, index) => (
                              <li key={index}>{file.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <FormDescription className="mt-1">Tải lên các chứng chỉ, bằng cấp để tăng uy tín</FormDescription>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
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
    </TutorDashboardLayout>
  );
}