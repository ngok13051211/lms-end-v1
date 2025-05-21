import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  DollarSign,
  BookOpen,
  Home,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { useToast } from "@/hooks/use-toast";
import React from "react";

// Define the TutorProfile type based on the schema
type TutorProfile = {
  id: number;
  user_id: number;
  bio?: string;
  availability?: string;
  is_verified: boolean;
  is_featured: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    role: string;
    is_verified: boolean;
    is_active: boolean;
  };
};

// Form schema for course
const courseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  subject_id: z.string().min(1, "Subject is required"),
  level_id: z.string().min(1, "Education level is required"),
  hourly_rate: z.coerce
    .number()
    .min(10000, "Hourly rate must be at least 10,000 VND"),
  teaching_mode: z.enum(["online", "offline", "both"]),
  status: z.enum(["active", "inactive"]).default("active"),
});

export default function TutorDashboardCourses() {
  const { toast } = useToast();
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);

  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading } =
    useQuery<TutorProfile>({
      queryKey: [`/api/v1/tutors/profile`],
      retry: false,
    });

  // Get subjects and education levels for course creation
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: [`/api/v1/subjects`],
    enabled: true,
  });

  const { data: educationLevels = [] } = useQuery<any[]>({
    queryKey: [`/api/v1/education-levels`],
    enabled: true,
  });

  // Fetch approved teaching requests when needed
  const { data: approvedRequests = [], isLoading: requestsLoading } = useQuery<
    any[]
  >({
    queryKey: [`/api/v1/tutors/teaching-requests?status=approved`],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/v1/tutors/teaching-requests?status=approved`
      );
      const data = await res.json();
      return data.requests || [];
    },
    enabled: courseDialogOpen, // Only fetch when the dialog is open
  });

  // Process the approved teaching requests to get unique subjects and levels
  const approvedSubjects = useMemo(() => {
    if (!approvedRequests.length) return [];

    // Extract unique subjects from approved requests
    const uniqueSubjects = Array.from(
      new Map(
        approvedRequests.map((request) => [request.subject.id, request.subject])
      ).values()
    );

    return uniqueSubjects;
  }, [approvedRequests]);

  // Get levels for the selected subject
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const approvedLevelsForSelectedSubject = useMemo(() => {
    if (!approvedRequests.length || !selectedSubjectId) return [];

    // Filter requests by the selected subject
    const requestsForSubject = approvedRequests.filter(
      (request) => request.subject.id.toString() === selectedSubjectId
    );

    // Extract unique levels from these requests
    const uniqueLevels = Array.from(
      new Map(
        requestsForSubject.map((request) => [request.level.id, request.level])
      ).values()
    );

    return uniqueLevels;
  }, [approvedRequests, selectedSubjectId]);

  // Define the type for course response
  interface CourseResponse {
    courses: any[];
  }

  // Get tutor's courses with better error handling
  const {
    data: coursesResponse,
    isLoading: coursesLoading,
    isError,
    error,
    refetch: refetchCourses,
  } = useQuery<CourseResponse>({
    queryKey: [`/api/v1/tutors/courses`],
    enabled: !!tutorProfile,
    retry: 1,
    gcTime: 0,
    staleTime: 0,
  });

  // Handle error with useEffect
  React.useEffect(() => {
    if (isError && error) {
      console.error("Failed to load courses:", error);
      toast({
        title: "Không thể tải khóa học",
        description:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi tải thông tin khóa học",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // Extract courses from response with safety check
  const courses = Array.isArray(coursesResponse?.courses)
    ? coursesResponse.courses
    : [];

  // Course form
  const courseForm = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      subject_id: "",
      level_id: "",
      hourly_rate: 200000, // Default hourly rate in VND
      teaching_mode: "online",
      status: "active",
    },
  });

  // Get subject ID from URL if available (for direct creation from subject page)
  const urlParams = new URLSearchParams(window.location.search);
  const subjectIdFromUrl = urlParams.get("subject_id");

  // Set subject_id if it exists in URL
  if (subjectIdFromUrl && !courseForm.getValues("subject_id")) {
    courseForm.setValue("subject_id", subjectIdFromUrl);
  }

  // Create course
  const createCourseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSchema>) => {
      // Format data for API
      const formattedData = {
        ...data,
        subject_id: data.subject_id ? parseInt(data.subject_id) : undefined,
        level_id: data.level_id ? parseInt(data.level_id) : undefined,
        hourly_rate: data.hourly_rate ? data.hourly_rate.toString() : undefined,
      };

      console.log("Sending data to API:", formattedData);
      const res = await apiRequest("POST", `/api/v1/courses`, formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/courses`] });
      setCourseDialogOpen(false);
      courseForm.reset();
      toast({
        title: "Thành công",
        description: "Khóa học đã được tạo thành công",
      });
    },
    onError: (error: any) => {
      console.error("Course creation error:", error);
      toast({
        title: "Lỗi tạo khóa học",
        description: error.message || "Đã xảy ra lỗi, vui lòng thử lại sau",
        variant: "destructive",
      });
    },
  });

  // Update course
  const updateCourseMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: z.infer<typeof courseSchema>;
    }) => {
      // Format data for API
      const formattedData = {
        ...data,
        subject_id: data.subject_id ? parseInt(data.subject_id) : undefined,
        level_id: data.level_id ? parseInt(data.level_id) : undefined,
        hourly_rate: data.hourly_rate ? data.hourly_rate.toString() : undefined,
      };

      console.log("Updating course with data:", formattedData);
      const res = await apiRequest(
        "PATCH",
        `/api/v1/courses/${id}`,
        formattedData
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/courses`] });
      setCourseDialogOpen(false);
      setEditingCourseId(null);
      courseForm.reset();
      toast({
        title: "Thành công",
        description: "Khóa học đã được cập nhật thành công",
      });
    },
    onError: (error: any) => {
      console.error("Course update error:", error);
      toast({
        title: "Lỗi cập nhật khóa học",
        description: error.message || "Đã xảy ra lỗi, vui lòng thử lại sau",
        variant: "destructive",
      });
    },
  });

  // Delete course
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/v1/courses/${id}`);

      // Kiểm tra nếu phản hồi có nội dung để parse
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        // Trả về một đối tượng mặc định nếu không có dữ liệu JSON
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/courses`] });
      toast({
        title: "Thành công",
        description: "Khóa học đã được xóa thành công",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi xóa khóa học",
        description: error.message || "Đã xảy ra lỗi, vui lòng thử lại sau",
        variant: "destructive",
      });
    },
  });

  const onSubmitCourse = async (data: z.infer<typeof courseSchema>) => {
    try {
      // Validate that selected subject and level are approved
      if (!editingCourseId) {
        // Only check for new courses
        const subjectApproved = approvedSubjects.some(
          (s: any) => s.id.toString() === data.subject_id
        );

        if (!subjectApproved) {
          toast({
            title: "Môn học không hợp lệ",
            description: "Vui lòng chọn một môn học đã được phê duyệt.",
            variant: "destructive",
          });
          return;
        }

        const levelApproved = approvedLevelsForSelectedSubject.some(
          (l: any) => l.id.toString() === data.level_id
        );

        if (!levelApproved) {
          toast({
            title: "Cấp độ không hợp lệ",
            description:
              "Vui lòng chọn một cấp độ đã được phê duyệt cho môn học này.",
            variant: "destructive",
          });
          return;
        }
      }

      if (editingCourseId) {
        await updateCourseMutation.mutateAsync({ id: editingCourseId, data });
      } else {
        await createCourseMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Course submission error:", error);
    }
  };

  const handleEditCourse = (course: any) => {
    setEditingCourseId(course.id);

    // Set selectedSubjectId so level dropdowns work correctly in edit mode
    setSelectedSubjectId(course.subject.id.toString());

    courseForm.reset({
      title: course.title,
      description: course.description,
      subject_id: course.subject.id.toString(),
      level_id: course.level.id.toString(),
      hourly_rate: Number(course.hourly_rate),
      teaching_mode: course.teaching_mode,
      status: course.status || "active",
    });

    setCourseDialogOpen(true);
  };

  const handleDeleteCourse = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa khóa học này?")) {
      await deleteCourseMutation.mutateAsync(id);
    }
  };

  const openNewCourseDialog = () => {
    if (!tutorProfile) {
      toast({
        title: "Không thể tạo khóa học",
        description: "Bạn cần hoàn thành hồ sơ gia sư trước khi tạo khóa học.",
        variant: "destructive",
      });
      return;
    }

    if (!tutorProfile.is_verified) {
      toast({
        title: "Không thể tạo khóa học",
        description:
          "Hồ sơ gia sư của bạn cần được xác minh trước khi tạo khóa học.",
        variant: "destructive",
      });
      return;
    }
    setEditingCourseId(null);

    // Try to get subject_id from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const subjectIdFromUrl = urlParams.get("subject_id");

    courseForm.reset({
      title: "",
      description: "",
      subject_id: subjectIdFromUrl || "",
      level_id: "",
      hourly_rate: 200000, // Default hourly rate in VND
      teaching_mode: "online",
      status: "active",
    });

    setCourseDialogOpen(true);
  };

  // Get the status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "secondary";
      case "expired":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const isLoading = profileLoading || coursesLoading;

  // Loading state
  if (isLoading) {
    return (
      <TutorDashboardLayout activePage="courses">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Đang tải...</span>
        </div>
      </TutorDashboardLayout>
    );
  }

  // Error state - show error with retry button
  if (isError) {
    return (
      <TutorDashboardLayout activePage="courses">
        <div className="p-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Không thể tải thông tin khóa học. Vui lòng thử lại sau."}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetchCourses()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </div>
      </TutorDashboardLayout>
    );
  }

  return (
    <TutorDashboardLayout activePage="courses">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-medium">Khóa học của tôi</h2>
          <p className="text-muted-foreground">
            Tạo và quản lý các khóa học của bạn để thu hút học viên
          </p>
        </div>

        <Button
          onClick={openNewCourseDialog}
          className="mt-4 sm:mt-0"
          disabled={
            !tutorProfile || (tutorProfile && !tutorProfile.is_verified)
          }
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Thêm khóa học mới
        </Button>
      </div>

      {!tutorProfile ? (
        <Alert className="mb-6">
          <AlertDescription>
            Bạn cần hoàn thành hồ sơ gia sư trước khi tạo khóa học.
          </AlertDescription>
        </Alert>
      ) : tutorProfile && !tutorProfile.is_verified ? (
        <Alert className="mb-6">
          <AlertDescription>
            Hồ sơ gia sư của bạn đang chờ xác minh. Bạn chỉ có thể tạo khóa học
            sau khi hồ sơ được quản trị viên xác minh.
          </AlertDescription>
        </Alert>
      ) : null}

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <Card key={course.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant={getStatusBadge(course.status) as any}>
                    {{
                      active: "Đang hiển thị",
                      pending: "Đang xem xét",
                      expired: "Hết hạn",
                    }[course.status as "active" | "pending" | "expired"] ||
                      "Unknown"}
                  </Badge>

                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCourse(course)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCourse(course.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{course.title}</CardTitle>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="flex space-x-2 mb-2">
                  <Badge variant="outline" className="flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {course.subject.name}
                  </Badge>
                  <Badge variant="outline" className="flex items-center">
                    <Home className="h-3 w-3 mr-1" />
                    {
                      {
                        online: "Trực tuyến",
                        offline: "Tại chỗ",
                        both: "Cả hai",
                      }[course.teaching_mode as "online" | "offline" | "both"]
                    }
                  </Badge>
                </div>

                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {course.description}
                </p>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Cấp độ</p>
                    <p className="font-medium">
                      {course.level?.name || "Chưa xác định"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Học phí</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(Number(course.hourly_rate))}
                      <span className="text-xs">/giờ</span>
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="text-xs text-muted-foreground pt-2">
                {new Date(course.created_at).toLocaleDateString("vi-VN")}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-xl font-medium">Chưa có khóa học nào</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Bạn chưa tạo khóa học nào. Tạo khóa học để học viên có thể tìm thấy
            bạn.
          </p>

          <Button
            onClick={openNewCourseDialog}
            className="mt-4 sm:mt-0"
            disabled={
              !tutorProfile || (tutorProfile && !tutorProfile.is_verified)
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm khóa học mới
          </Button>
        </div>
      )}

      {/* Course Create/Edit Dialog */}
      <Dialog
        open={courseDialogOpen}
        onOpenChange={(open) => {
          setCourseDialogOpen(open);
          if (!open) {
            // Reset state when dialog is closed
            setSelectedSubjectId("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCourseId ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}
            </DialogTitle>
            <DialogDescription>
              {editingCourseId
                ? "Cập nhật thông tin khóa học của bạn"
                : "Tạo khóa học để học viên có thể tìm thấy bạn"}
            </DialogDescription>
          </DialogHeader>

          {!editingCourseId && (
            <Alert variant="default" className="bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bạn chỉ có thể tạo khóa học cho các môn học và cấp độ đã được
                admin phê duyệt qua yêu cầu giảng dạy.
              </AlertDescription>
            </Alert>
          )}

          <Form {...courseForm}>
            <form
              onSubmit={courseForm.handleSubmit(onSubmitCourse)}
              className="space-y-6"
            >
              <FormField
                control={courseForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Khóa học Hóa học lớp 10, 11, 12"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Tiêu đề ngắn gọn, hấp dẫn để thu hút học viên
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={courseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả chi tiết về khóa học, phương pháp giảng dạy, lợi ích khi học với bạn..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Tối thiểu 20 ký tự</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={courseForm.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Môn học</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedSubjectId(value);
                          // Reset level when changing subject
                          courseForm.setValue("level_id", "");
                        }}
                        defaultValue={field.value}
                        disabled={
                          approvedSubjects.length === 0 || requestsLoading
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn môn học" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {requestsLoading ? (
                            <SelectItem value="loading" disabled>
                              Đang tải...
                            </SelectItem>
                          ) : approvedSubjects.length === 0 ? (
                            <SelectItem value="none" disabled>
                              Không có môn học được phê duyệt
                            </SelectItem>
                          ) : (
                            approvedSubjects.map((subject: any) => (
                              <SelectItem
                                key={subject.id}
                                value={subject.id.toString()}
                              >
                                {subject.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {approvedSubjects.length === 0 && !requestsLoading && (
                        <FormDescription className="text-amber-500">
                          Bạn chưa được phê duyệt để dạy bất kỳ môn học nào. Vui
                          lòng gửi yêu cầu giảng dạy trước.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courseForm.control}
                  name="level_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cấp độ</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={
                          !selectedSubjectId ||
                          approvedLevelsForSelectedSubject.length === 0
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cấp độ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!selectedSubjectId ? (
                            <SelectItem value="none" disabled>
                              Chọn môn học trước
                            </SelectItem>
                          ) : approvedLevelsForSelectedSubject.length === 0 ? (
                            <SelectItem value="none" disabled>
                              Không có cấp độ được phê duyệt cho môn học này
                            </SelectItem>
                          ) : (
                            approvedLevelsForSelectedSubject.map(
                              (level: any) => (
                                <SelectItem
                                  key={level.id}
                                  value={level.id.toString()}
                                >
                                  {level.name}
                                </SelectItem>
                              )
                            )
                          )}
                        </SelectContent>
                      </Select>
                      {selectedSubjectId &&
                        approvedLevelsForSelectedSubject.length === 0 && (
                          <FormDescription className="text-amber-500">
                            Bạn chưa được phê duyệt để dạy cấp độ nào cho môn
                            học này.
                          </FormDescription>
                        )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={courseForm.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Học phí (mỗi giờ)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Học phí bằng VND mỗi giờ
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={courseForm.control}
                  name="teaching_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hình thức dạy</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn hình thức" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="online">Trực tuyến</SelectItem>
                          <SelectItem value="offline">Tại chỗ</SelectItem>
                          <SelectItem value="both">Cả hai</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={courseForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Đang hiển thị</SelectItem>
                        <SelectItem value="inactive">Ẩn</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Khóa học ở trạng thái "Đang hiển thị" sẽ được hiển thị cho
                      học viên
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCourseDialogOpen(false);
                    courseForm.reset();
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createCourseMutation.isPending ||
                    updateCourseMutation.isPending
                  }
                >
                  {(createCourseMutation.isPending ||
                    updateCourseMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingCourseId ? "Cập nhật" : "Tạo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TutorDashboardLayout>
  );
}
