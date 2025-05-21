import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Upload } from "lucide-react";
import { Link } from "wouter";
import { updateUserProfile, updateAvatar } from "@/features/auth/authSlice";
import { useToast } from "@/hooks/use-toast";

// Form schema for student profile
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email").optional(),
});

export default function StudentDashboardProfile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile form
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.first_name || "",
      lastName: user?.last_name || "",
      email: user?.email || "",
    },
  });

  // Cập nhật form khi user thay đổi
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
      });
    }
  }, [user, form]);

  // Upload avatar
  const uploadAvatar = async () => {
    if (!avatar) return;

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", avatar);

      // Sử dụng apiRequest thay vì fetch trực tiếp để đảm bảo xác thực được xử lý đúng
      const response = await fetch("/api/v1/users/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          // Không đặt Content-Type với FormData, trình duyệt sẽ tự động thêm với boundary cần thiết
          // Thêm Authorization header nếu có token
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();

        console.log("Cập nhật avatar thành công:", data);

        // Cập nhật Redux store với avatar URL mới
        if (data.user?.avatar) {
          dispatch(updateAvatar(data.user.avatar));
        }

        // Cập nhật React Query cache
        queryClient.invalidateQueries({ queryKey: ["/api/v1/auth/me"] });

        // Hiển thị thông báo thành công
        toast({
          title: "Thành công",
          description: "Ảnh đại diện đã được cập nhật",
          variant: "default",
        });
      } else {
        // Xử lý lỗi từ phản hồi
        const errorData = await response
          .json()
          .catch(() => ({ message: "Lỗi không xác định" }));
        console.error("Upload avatar error:", errorData);

        toast({
          title: "Lỗi",
          description:
            errorData.message ||
            "Không thể tải lên ảnh đại diện. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      // Hiển thị thông báo lỗi
      toast({
        title: "Lỗi",
        description: "Không thể tải lên ảnh đại diện. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      setAvatar(null);
    }
  };

  const handleOnAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  // Update profile
  const updateProfile = async (data: z.infer<typeof profileSchema>) => {
    try {
      // Chuyển đổi từ camelCase sang snake_case cho API
      const apiData = {
        first_name: data.firstName,
        last_name: data.lastName,
      };

      const response = await apiRequest(
        "PATCH",
        "/api/v1/users/profile",
        apiData
      );

      if (response.ok) {
        // Cập nhật Redux store
        const responseData = await response.json();
        dispatch(updateUserProfile(apiData));

        // Cập nhật React Query cache
        queryClient.invalidateQueries({ queryKey: ["/api/v1/auth/me"] });

        // Hiển thị thông báo thành công
        toast({
          title: "Thành công",
          description: "Hồ sơ của bạn đã được cập nhật",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      // Hiển thị thông báo lỗi
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật hồ sơ. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium">Hồ sơ của bạn</h1>
          <div className="flex gap-2">
            <Link href="/dashboard/student/tutors">
              <Button variant="outline">Gia sư yêu thích</Button>
            </Link>
            <Link href="/dashboard/student/bookings">
              <Button variant="outline">Đặt lịch học</Button>
            </Link>
            <Link href="/dashboard/student/messages">
              <Button variant="outline">Tin nhắn</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
            <CardDescription>Quản lý thông tin cá nhân của bạn</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex flex-col items-center">
                  <Avatar className="h-32 w-32 mb-4">
                    <AvatarImage
                      src={user?.avatar || undefined}
                      alt={user?.first_name}
                    />
                    <AvatarFallback className="text-3xl">
                      {user?.first_name?.[0]}
                      {user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="w-full">
                    <label className="block mb-2 text-sm font-medium">
                      Cập nhật ảnh đại diện
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="avatar-upload"
                        onChange={handleOnAvatarChange}
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
                          onClick={uploadAvatar}
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

              <div className="md:col-span-2">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(updateProfile)}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tên</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Họ</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <Badge variant="outline" className="mr-2">
                        Học viên
                      </Badge>
                      <Badge variant="outline">
                        Tham gia{" "}
                        {new Date(user?.created_at || "").toLocaleDateString()}
                      </Badge>
                    </div>

                    <Button type="submit">Cập nhật hồ sơ</Button>
                  </form>
                </Form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
