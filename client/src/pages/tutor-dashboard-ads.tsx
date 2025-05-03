import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { Loader2, PlusCircle, Edit, Trash2, DollarSign, BookOpen, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { useToast } from "@/hooks/use-toast";

// Form schema for ad
const adSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  subject_id: z.string().min(1, "Subject is required"),
  level_id: z.string().min(1, "Education level is required"),
  hourly_rate: z.coerce.number().min(10000, "Hourly rate must be at least 10,000 VND"),
  teaching_mode: z.enum(["online", "offline", "both"]),
  status: z.enum(["active", "inactive"]).default("active"),
});

export default function TutorDashboardAds() {
  const { toast } = useToast();
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  
  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false,
  });
  
  // Get subjects and education levels for ad creation
  const { data: subjects } = useQuery({
    queryKey: [`/api/v1/subjects`],
    enabled: true,
  });
  
  const { data: educationLevels } = useQuery({
    queryKey: [`/api/v1/education-levels`],
    enabled: true,
  });
  
  // Get tutor's ads
  const { data: ads, isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: [`/api/v1/tutors/ads`],
    enabled: !!tutorProfile,
  });

  // Ad form
  const adForm = useForm<z.infer<typeof adSchema>>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: "",
      description: "",
      subject_id: "",
      level_id: "",
      hourly_rate: tutorProfile?.hourly_rate ? Number(tutorProfile.hourly_rate) : 0,
      teaching_mode: tutorProfile?.teaching_mode || "online",
      status: "active",
    },
  });

  // Create ad
  const createAdMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adSchema>) => {
      // Chuyển đổi kiểu dữ liệu cho phù hợp với API
      const formattedData = {
        ...data,
        subject_id: data.subject_id ? parseInt(data.subject_id) : undefined,
        level_id: data.level_id ? parseInt(data.level_id) : undefined,
        hourly_rate: data.hourly_rate ? data.hourly_rate.toString() : undefined,
      };
      
      console.log("Sending data to API:", formattedData);
      const res = await apiRequest("POST", `/api/v1/tutors/ads`, formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/ads`] });
      setAdDialogOpen(false);
      adForm.reset();
      toast({
        title: "Success",
        description: "Ad created successfully",
      });
    },
    onError: (error: any) => {
      console.error("Ad creation error:", error);
      toast({
        title: "Error creating ad",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Update ad
  const updateAdMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof adSchema> }) => {
      // Chuyển đổi kiểu dữ liệu cho phù hợp với API
      const formattedData = {
        ...data,
        subject_id: data.subject_id ? parseInt(data.subject_id) : undefined,
        level_id: data.level_id ? parseInt(data.level_id) : undefined,
        hourly_rate: data.hourly_rate ? data.hourly_rate.toString() : undefined,
      };
      
      console.log("Updating ad with data:", formattedData);
      const res = await apiRequest("PATCH", `/api/v1/tutors/ads/${id}`, formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/ads`] });
      setAdDialogOpen(false);
      setEditingAdId(null);
      adForm.reset();
      toast({
        title: "Success",
        description: "Ad updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Ad update error:", error);
      toast({
        title: "Error updating ad",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Delete ad
  const deleteAdMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/v1/tutors/ads/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/ads`] });
      toast({
        title: "Success",
        description: "Ad deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting ad",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmitAd = async (data: z.infer<typeof adSchema>) => {
    try {
      if (editingAdId) {
        await updateAdMutation.mutateAsync({ id: editingAdId, data });
      } else {
        await createAdMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Ad submission error:", error);
    }
  };

  const handleEditAd = (ad: any) => {
    setEditingAdId(ad.id);
    
    adForm.reset({
      title: ad.title,
      description: ad.description,
      subject_id: ad.subject.id.toString(),
      level_id: ad.level.id.toString(),
      hourly_rate: Number(ad.hourly_rate),
      teaching_mode: ad.teaching_mode,
      status: ad.status || "active",
    });
    
    setAdDialogOpen(true);
  };

  const handleDeleteAd = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thông báo này?")) {
      await deleteAdMutation.mutateAsync(id);
    }
  };

  const openNewAdDialog = () => {
    setEditingAdId(null);
    adForm.reset({
      title: "",
      description: "",
      subject_id: "",
      level_id: "",
      hourly_rate: tutorProfile?.hourly_rate ? Number(tutorProfile.hourly_rate) : 0,
      teaching_mode: tutorProfile?.teaching_mode || "online",
      status: "active",
    });
    setAdDialogOpen(true);
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

  const isLoading = profileLoading || adsLoading;

  if (isLoading) {
    return (
      <TutorDashboardLayout activePage="ads">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading...</span>
        </div>
      </TutorDashboardLayout>
    );
  }

  return (
    <TutorDashboardLayout activePage="ads">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-medium">Thông báo dạy</h2>
          <p className="text-muted-foreground">
            Tạo và quản lý các thông báo nhận học viên của bạn
          </p>
        </div>
        
        <Button 
          onClick={openNewAdDialog} 
          className="mt-4 sm:mt-0"
          disabled={!tutorProfile}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Thêm thông báo mới
        </Button>
      </div>

      {!tutorProfile ? (
        <Alert className="mb-6">
          <AlertDescription>
            Bạn cần hoàn thành hồ sơ gia sư trước khi tạo thông báo dạy.
          </AlertDescription>
        </Alert>
      ) : null}
      
      {ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad: any) => (
            <Card key={ad.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant={getStatusBadge(ad.status) as any}>
                    {{
                      active: "Đang hiển thị",
                      pending: "Đang xem xét",
                      expired: "Hết hạn"
                    }[ad.status]}
                  </Badge>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditAd(ad)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteAd(ad.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{ad.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="pb-3">
                <div className="flex space-x-2 mb-2">
                  <Badge variant="outline" className="flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {ad.subject.name}
                  </Badge>
                  <Badge variant="outline" className="flex items-center">
                    <Home className="h-3 w-3 mr-1" />
                    {{
                      online: "Trực tuyến",
                      offline: "Tại chỗ",
                      both: "Cả hai"
                    }[ad.teaching_mode]}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {ad.description}
                </p>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Cấp độ</p>
                    <p className="font-medium">{ad.level.name}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Học phí</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND' 
                      }).format(Number(ad.hourly_rate))}<span className="text-xs">/giờ</span>
                    </p>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="text-xs text-muted-foreground pt-2">
                {new Date(ad.created_at).toLocaleDateString('vi-VN')}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-xl font-medium">Chưa có thông báo nào</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Bạn chưa tạo thông báo dạy nào. Tạo thông báo để học viên có thể tìm thấy bạn.
          </p>
          <Button className="mt-6" onClick={openNewAdDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tạo thông báo dạy
          </Button>
        </div>
      )}
      
      {/* Ad Create/Edit Dialog */}
      <Dialog open={adDialogOpen} onOpenChange={setAdDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAdId ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}
            </DialogTitle>
            <DialogDescription>
              {editingAdId 
                ? "Cập nhật thông tin thông báo dạy của bạn" 
                : "Tạo thông báo để học viên có thể tìm thấy bạn"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...adForm}>
            <form onSubmit={adForm.handleSubmit(onSubmitAd)} className="space-y-6">
              <FormField
                control={adForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: Nhận dạy Hóa học lớp 10, 11, 12" {...field} />
                    </FormControl>
                    <FormDescription>
                      Tiêu đề ngắn gọn, hấp dẫn để thu hút học viên
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={adForm.control}
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
                    <FormDescription>
                      Tối thiểu 20 ký tự
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={adForm.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Môn học</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn môn học" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects?.map((subject: any) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
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
                  control={adForm.control}
                  name="level_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cấp độ</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cấp độ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {educationLevels?.map((level: any) => (
                            <SelectItem key={level.id} value={level.id.toString()}>
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
                  control={adForm.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Học phí (VND/giờ)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Học phí tính theo VND/giờ
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={adForm.control}
                  name="teaching_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hình thức dạy</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn hình thức dạy" />
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
                control={adForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Đang hiển thị</SelectItem>
                        <SelectItem value="inactive">Không hiển thị</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Chọn "Đang hiển thị" để thông báo được hiển thị cho học viên
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createAdMutation.isPending || updateAdMutation.isPending}
                >
                  {(createAdMutation.isPending || updateAdMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingAdId ? "Cập nhật" : "Tạo thông báo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </TutorDashboardLayout>
  );
}