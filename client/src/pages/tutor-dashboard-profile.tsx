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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";

// Form schema for tutor profile
const tutorProfileSchema = z.object({
  bio: z.string().min(50, "Bio must be at least 50 characters"),
  education: z.string().min(20, "Education must be at least 20 characters"),
  experience: z.string().min(20, "Experience must be at least 20 characters"),
  hourlyRate: z.coerce.number().min(10000, "Hourly rate must be at least 10,000 VND"),
  teachingMode: z.enum(["online", "offline", "both"]),
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
  
  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading, error: profileError, refetch: refetchTutorProfile } = useQuery<any>({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false, // Don't retry on error
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
      profileForm.reset({
        bio: tutorProfile.bio || "",
        education: tutorProfile.education || "",
        experience: tutorProfile.experience || "",
        hourlyRate: tutorProfile.hourlyRate ? Number(tutorProfile.hourlyRate) : 10000,
        teachingMode: (tutorProfile.teachingMode as "online" | "offline" | "both") || "online",
      });
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
      
      // Combine form data with selected subjects and levels
      const completeData = {
        ...data,
        subject_ids: selectedSubjects,
        level_ids: selectedLevels,
      };
      
      const res = await apiRequest(method, `/api/v1/tutors/profile`, completeData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      setProfileDialogOpen(false);
    },
  });

  // Update avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      
      const res = await fetch("/api/v1/auth/update-avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Failed to upload avatar");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/auth/me`] });
    },
  });
  
  // Upload certifications
  const uploadCertificationsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("documents", file);
      });
      
      const res = await fetch("/api/v1/tutors/certifications", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error("Failed to upload certifications");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };
  
  const handleCertificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      setCertifications(fileArray);
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
      } finally {
        setUploadingCertifications(false);
      }
    }
  };

  const onSubmitProfile = async (data: z.infer<typeof tutorProfileSchema>) => {
    try {
      await profileMutation.mutateAsync(data);
    } catch (error) {
      console.error("Profile update error:", error);
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
    } else {
      // Clear selections when no profile exists
      setSelectedSubjects([]);
      setSelectedLevels([]);
    }
  }, [tutorProfile]);

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
                          {tutorProfile.educationLevels?.map((level: any) => (
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
                        {new Intl.NumberFormat('vi-VN', { 
                          style: 'currency', 
                          currency: 'VND' 
                        }).format(Number(tutorProfile.hourlyRate))}
                        <span className="text-sm text-muted-foreground ml-1">/giờ</span>
                      </p>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Hình thức dạy</h3>
                      <Badge>
                        {tutorProfile.teachingMode && {
                          online: "Trực tuyến",
                          offline: "Tại chỗ",
                          both: "Cả hai"
                        }[tutorProfile.teachingMode as 'online' | 'offline' | 'both'] || "Không xác định"}
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
                      <div className="mt-2 p-3 border rounded-md bg-slate-50">
                        {tutorProfile.certifications}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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