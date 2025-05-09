import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  DollarSign,
  BookOpen,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { TutorProfile } from "@shared/schema";

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

  // Get tutor's courses
  const {
    data: courses = [],
    isLoading: coursesLoading,
    refetch: refetchCourses,
  } = useQuery<any[]>({
    queryKey: [`/api/v1/tutors/courses`],
    enabled: !!tutorProfile,
  });

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
      const res = await apiRequest(
        "POST",
        `/api/v1/tutors/courses`,
        formattedData
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/courses`] });
      setCourseDialogOpen(false);
      courseForm.reset();
      toast({
        title: "Success",
        description: "Course created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Course creation error:", error);
      toast({
        title: "Error creating course",
        description: error.message || "Something went wrong",
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
        `/api/v1/tutors/courses/${id}`,
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
        title: "Success",
        description: "Course updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Course update error:", error);
      toast({
        title: "Error updating course",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Delete course
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/v1/tutors/courses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/courses`] });
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting course",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmitCourse = async (data: z.infer<typeof courseSchema>) => {
    try {
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

  if (isLoading) {
    return (
      <TutorDashboardLayout activePage="courses">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading...</span>
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
                    <p className="font-medium">{course.level.name}</p>
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
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
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
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn môn học" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects?.map((subject: any) => (
                            <SelectItem
                              key={subject.id}
                              value={subject.id.toString()}
                            >
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cấp độ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {educationLevels?.map((level: any) => (
                            <SelectItem
                              key={level.id}
                              value={level.id.toString()}
                            >
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
