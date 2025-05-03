import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { updateUserProfile, updateAvatar } from "@/features/auth/authSlice";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Loader2, User, ChevronRight, MessageSquare, Star, Upload } from "lucide-react";
import TutorCard from "@/components/ui/TutorCard";

// Form schema for student profile
const profileSchema = z.object({
  firstName: z.string().min(2, "Họ phải có ít nhất 2 ký tự"),
  lastName: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Vui lòng nhập đúng định dạng email").optional(),
});

// Định nghĩa kiểu dữ liệu cho favorites và conversations
// Định nghĩa kiểu dữ liệu cho favorites tutors
type FavoriteTutorUser = {
  id: number;
  first_name: string;
  last_name: string;
  avatar: string | null;
};

type FavoriteTutor = {
  id: number;
  user_id: number;
  bio: string;
  hourly_rate: string | number;
  teaching_mode?: string;
  rating?: number | string;
  availability?: string;
  education?: string;
  user: FavoriteTutorUser;
  subjects?: any[];
  is_featured?: boolean;
  [key: string]: any;
};

type Conversation = {
  id: number;
  student_id: number;
  tutor_id: number;
  tutor?: {
    id: number;
    avatar?: string | null;
    first_name: string;
    last_name: string;
    [key: string]: any;
  };
  lastMessageAt: Date | string;
  lastMessage?: {
    content: string;
  };
  [key: string]: any;
};

export default function StudentDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Get favorite tutors
  const { data: favoriteTutors = [], isLoading: tutorsLoading } = useQuery<FavoriteTutor[]>({
    queryKey: ['/api/v1/students/favorite-tutors'],
  });
  
  // Get recent conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/v1/conversations'],
  });
  
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
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        console.log("Cập nhật avatar thành công:", data);
        
        // Cập nhật Redux store với avatar URL mới
        if (data.user?.avatar) {
          dispatch(updateAvatar(data.user.avatar));
        }
        
        // Cập nhật React Query cache
        queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/me'] });
        
        // Hiển thị thông báo thành công
        toast({
          title: "Thành công",
          description: "Ảnh đại diện đã được cập nhật",
          variant: "default",
        });
      } else {
        // Xử lý lỗi từ phản hồi
        const errorData = await response.json().catch(() => ({ message: "Lỗi không xác định" }));
        console.error("Upload avatar error:", errorData);
        
        toast({
          title: "Lỗi",
          description: errorData.message || "Không thể tải lên ảnh đại diện. Vui lòng thử lại sau.",
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
        last_name: data.lastName
      };
      
      const response = await apiRequest("PATCH", "/api/v1/users/profile", apiData);
      
      if (response.ok) {
        // Cập nhật Redux store
        const responseData = await response.json();
        dispatch(updateUserProfile(apiData));
        
        // Cập nhật React Query cache
        queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/me'] });
        
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
  
  const isLoading = tutorsLoading || conversationsLoading;
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Đang tải bảng điều khiển...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-medium mb-6">Bảng điều khiển học viên</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Xin chào</p>
                  <p className="text-lg font-medium">
                    {user?.first_name} {user?.last_name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Gia sư yêu thích</p>
                  <p className="text-lg font-medium">{favoriteTutors?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Cuộc trò chuyện</p>
                  <p className="text-lg font-medium">{conversations?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="profile">
          <TabsList className="mb-8">
            <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
            <TabsTrigger value="favorites">Gia sư yêu thích</TabsTrigger>
            <TabsTrigger value="messages">Tin nhắn</TabsTrigger>
          </TabsList>
          
          <div className="mb-4 mt-2 flex justify-end">
            <div className="space-x-2">
              <Link href="/dashboard/student/profile">
                <Button variant="outline" size="sm">Đi đến trang hồ sơ đầy đủ</Button>
              </Link>
              <Link href="/dashboard/student/tutors">
                <Button variant="outline" size="sm">Đi đến trang gia sư yêu thích</Button>
              </Link>
              <Link href="/dashboard/student/messages">
                <Button variant="outline" size="sm">Đi đến trang tin nhắn</Button>
              </Link>
            </div>
          </div>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Hồ sơ của bạn</CardTitle>
                <CardDescription>
                  Quản lý thông tin cá nhân của bạn
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="flex flex-col items-center">
                      <Avatar className="h-32 w-32 mb-4">
                        <AvatarImage src={user?.avatar || undefined} alt={user?.first_name || ""} />
                        <AvatarFallback className="text-3xl">
                          {user?.first_name?.[0]}{user?.last_name?.[0]}
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
                      <form onSubmit={form.handleSubmit(updateProfile)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Họ</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Nhập họ của bạn" />
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
                                <FormLabel>Tên</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Nhập tên của bạn" />
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
                            Tham gia {new Date(user?.created_at || "").toLocaleDateString()}
                          </Badge>
                        </div>
                        
                        <Button type="submit" className="bg-primary hover:bg-primary/90">
                          Cập nhật hồ sơ
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle>Gia sư yêu thích</CardTitle>
                <CardDescription>
                  Các gia sư bạn đã thêm vào danh sách yêu thích
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {favoriteTutors && favoriteTutors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteTutors.map((tutor: FavoriteTutor) => (
                      <TutorCard key={tutor.id} tutor={tutor} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">Chưa có gia sư yêu thích</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Bạn chưa thêm gia sư nào vào danh sách yêu thích. Tìm kiếm gia sư và nhấp vào biểu tượng ngôi sao để thêm họ vào danh sách yêu thích.
                    </p>
                    <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/tutors")}>
                      Tìm gia sư
                    </Button>
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
                  Các cuộc trò chuyện của bạn với gia sư
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {conversations && conversations.length > 0 ? (
                  <div className="space-y-2">
                    {conversations.map((conversation: Conversation) => (
                      <Link key={conversation.id} href={`/dashboard/student/messages/${conversation.id}`}>
                        <a className="flex items-center p-4 border rounded-lg hover:border-primary transition-colors">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.tutor?.avatar || undefined} alt={conversation.tutor?.first_name || ""} />
                            <AvatarFallback>
                              {conversation.tutor?.first_name?.[0]}{conversation.tutor?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                {conversation.tutor?.first_name} {conversation.tutor?.last_name}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                {new Date(conversation.lastMessageAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage?.content || "Bắt đầu cuộc trò chuyện"}
                            </p>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </a>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">Chưa có tin nhắn</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Bạn chưa bắt đầu cuộc trò chuyện nào với gia sư. Tìm kiếm gia sư và nhắn tin cho họ để bắt đầu.
                    </p>
                    <Button className="mt-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/tutors")}>
                      Tìm gia sư
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
