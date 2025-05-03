import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, PlusCircle, Edit, Trash2, Upload, AlertCircle, ChevronRight, UserCircle, BookOpen, MessageSquare, BadgeCheck, DollarSign, Star, FileText, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// Form schema for tutor profile
const tutorProfileSchema = z.object({
  bio: z.string().min(50, "Bio must be at least 50 characters"),
  education: z.string().min(20, "Education must be at least 20 characters"),
  experience: z.string().min(20, "Experience must be at least 20 characters"),
  hourlyRate: z.coerce.number().min(10000, "Hourly rate must be at least 10,000 VND"),
  teachingMode: z.enum(["online", "offline", "both"]),
});

// Form schema for ad
const adSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  subjectId: z.string().min(1, "Subject is required"),
  levelId: z.string().min(1, "Education level is required"),
  hourlyRate: z.coerce.number().min(10000, "Hourly rate must be at least 10,000 VND"),
  teachingMode: z.enum(["online", "offline", "both"]),
});

export default function TutorDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  
  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false, // Don't retry on error
  });

  // Only load other data if profile exists
  const hasProfile = !!tutorProfile && !profileError;

  // Get subjects and education levels for profile editing
  const { data: subjects } = useQuery({
    queryKey: [`/api/v1/subjects`],
    enabled: true, // Always fetch subjects for profile creation
  });
  
  const { data: educationLevels } = useQuery({
    queryKey: [`/api/v1/education-levels`],
    enabled: true, // Always fetch education levels for profile creation
  });
  
  // Get tutor's ads
  const { data: ads, isLoading: adsLoading } = useQuery({
    queryKey: [`/api/v1/tutors/ads`],
    enabled: hasProfile, // Only fetch if profile exists
  });
  
  // Get all conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: [`/api/v1/conversations`],
    enabled: hasProfile, // Only fetch if profile exists
  });
  
  // Get tutor's stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/v1/tutors/stats`],
    enabled: hasProfile, // Only fetch if profile exists
  });

  // Tutor profile form
  const profileForm = useForm<z.infer<typeof tutorProfileSchema>>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      bio: tutorProfile?.bio || "",
      education: tutorProfile?.education || "",
      experience: tutorProfile?.experience || "",
      hourlyRate: tutorProfile?.hourlyRate ? Number(tutorProfile.hourlyRate) : 0,
      teachingMode: tutorProfile?.teachingMode || "online",
    },
  });
  
  // Ad form
  const adForm = useForm<z.infer<typeof adSchema>>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: "",
      description: "",
      subjectId: "",
      levelId: "",
      hourlyRate: tutorProfile?.hourlyRate ? Number(tutorProfile.hourlyRate) : 0,
      teachingMode: tutorProfile?.teachingMode || "online",
    },
  });
  
  // Create/Update tutor profile
  const profileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tutorProfileSchema>) => {
      const method = tutorProfile ? "PATCH" : "POST";
      const response = await apiRequest(
        method,
        "/api/v1/tutors/profile",
        {
          ...data,
          subjects: selectedSubjects,
          educationLevels: selectedLevels,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      setProfileDialogOpen(false);
    },
  });
  
  // Create ad
  const createAdMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adSchema>) => {
      const response = await apiRequest(
        "POST",
        "/api/v1/tutors/ads",
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/ads`] });
      adForm.reset();
      setAdDialogOpen(false);
    },
  });
  
  // Delete ad
  const deleteAdMutation = useMutation({
    mutationFn: async (adId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/v1/tutors/ads/${adId}`,
        undefined
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/ads`] });
    },
  });
  
  // Upload avatar
  const uploadAvatar = async () => {
    if (!avatar) return;
    
    setUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append("avatar", avatar);
      
      const response = await fetch("/api/v1/users/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/v1/tutors/profile`] });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setUploadingAvatar(false);
      setAvatar(null);
    }
  };

  // When opening the profile dialog, set the default values
  const handleOpenProfileDialog = () => {
    console.log("Opening profile dialog");
    
    // Reset form to default values
    if (tutorProfile) {
      profileForm.reset({
        bio: tutorProfile.bio || "",
        education: tutorProfile.education || "",
        experience: tutorProfile.experience || "",
        hourlyRate: Number(tutorProfile.hourlyRate) || 0,
        teachingMode: tutorProfile.teachingMode || "online",
      });
      
      // Set selected subjects and levels
      setSelectedSubjects(
        tutorProfile.subjects?.map(subject => subject.id.toString()) || []
      );
      
      setSelectedLevels(
        tutorProfile.educationLevels?.map(level => level.id.toString()) || []
      );
    } else {
      // Reset form for new profile
      profileForm.reset({
        bio: "",
        education: "",
        experience: "",
        hourlyRate: 50000, // Default hourly rate (50.000 VND)
        teachingMode: "online",
      });
      
      setSelectedSubjects([]);
      setSelectedLevels([]);
    }
    
    // Open dialog after form reset
    setProfileDialogOpen(true);
  };
  
  const handleOnAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };
  
  const isLoading = profileLoading || adsLoading || conversationsLoading || statsLoading;
  
  // Show complete profile notice if no tutor profile
  if (profileError && profileError.message === "Invalid tutor ID") {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-medium mb-4">Complete Your Tutor Profile</h1>
            <Alert className="mb-8">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Profile Required</AlertTitle>
              <AlertDescription>
                You've registered as a tutor, but you need to complete your profile before students can find you.
                Please fill out your profile information to start teaching.
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Tutor Profile</CardTitle>
                <CardDescription>
                  Tell students about yourself, your teaching style, and your expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleOpenProfileDialog} className="w-full sm:w-auto">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Your Profile
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Why Complete Your Profile?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Be discovered by students looking for tutors in your subjects</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Create teaching ads for specific subjects and levels</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Receive messages and inquiries from interested students</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Build your reputation through ratings and reviews</span>
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
                    <h3 className="mb-1 text-lg font-semibold">Create Profile</h3>
                    <p className="text-sm text-muted-foreground">Fill out your profile information completely</p>
                  </li>
                  <li className="mb-6 ml-6">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-primary/70 rounded-full -left-4 ring-4 ring-white dark:ring-gray-900 text-white">
                      2
                    </span>
                    <h3 className="mb-1 text-lg font-semibold">Admin Review</h3>
                    <p className="text-sm text-muted-foreground">Our team will review your profile</p>
                  </li>
                  <li className="ml-6">
                    <span className="absolute flex items-center justify-center w-8 h-8 bg-primary/50 rounded-full -left-4 ring-4 ring-white dark:ring-gray-900 text-white">
                      3
                    </span>
                    <h3 className="mb-1 text-lg font-semibold">Start Teaching</h3>
                    <p className="text-sm text-muted-foreground">Once approved, you can create ads and teach students</p>
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
            <h1 className="text-2xl font-medium mb-1">Tutor Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your profile, ads, and student communications
            </p>
          </div>
          
          {!tutorProfile && (
            <Alert className="mt-4 md:mt-0 md:w-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete your tutor profile to start receiving student inquiries.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCircle className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Profile Status</p>
                  <p className="text-lg font-medium">
                    {tutorProfile ? "Complete" : "Incomplete"}
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
                  <p className="text-sm text-muted-foreground">Active Ads</p>
                  <p className="text-lg font-medium">{ads?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Conversations</p>
                  <p className="text-lg font-medium">{conversations?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="profile">
          <TabsList className="mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="ads">My Ads</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Tutor Profile</CardTitle>
                <CardDescription>
                  Your profile information visible to students
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {tutorProfile ? (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <Avatar className="h-32 w-32 border-2 border-primary">
                            <AvatarImage src={user?.avatar} alt={user?.firstName} />
                            <AvatarFallback className="text-3xl">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="mt-4">
                            <label className="block mb-2 text-sm font-medium">
                              Update Profile Photo
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
                                Choose File
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
                                      Uploading...
                                    </>
                                  ) : (
                                    "Upload"
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
                              Full Name
                            </h3>
                            <p className="text-base">
                              {user?.firstName} {user?.lastName}
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
                              Hourly Rate
                            </h3>
                            <p className="text-base text-secondary font-medium">
                              {new Intl.NumberFormat('vi-VN', { 
                                style: 'currency', 
                                currency: 'VND'
                              }).format(Number(tutorProfile.hourlyRate))}{" "}
                              <span className="text-sm font-normal text-muted-foreground">/hour</span>
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Teaching Mode
                            </h3>
                            <p className="text-base capitalize">
                              {tutorProfile.teachingMode === "online" ? "Online" : 
                              tutorProfile.teachingMode === "offline" ? "In-person" : 
                              "Online & In-person"}
                            </p>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Verification Status
                            </h3>
                            <div className="flex items-center">
                              {tutorProfile.isVerified ? (
                                <>
                                  <BadgeCheck className="h-4 w-4 text-success mr-1" />
                                  <span className="text-success">Verified</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-warning mr-1" />
                                  <span className="text-warning">Pending Verification</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Rating
                            </h3>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-warning fill-warning mr-1" />
                              <span>{tutorProfile.rating} ({tutorProfile.totalReviews} reviews)</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Subjects
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {tutorProfile.subjects?.map((subject) => (
                              <Badge key={subject.id} variant="outline">
                                {subject.name}
                              </Badge>
                            ))}
                            {(tutorProfile.subjects?.length || 0) === 0 && (
                              <span className="text-muted-foreground">No subjects added</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Education Levels
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {tutorProfile.educationLevels?.map((level) => (
                              <Badge key={level.id} variant="outline">
                                {level.name}
                              </Badge>
                            ))}
                            {(tutorProfile.educationLevels?.length || 0) === 0 && (
                              <span className="text-muted-foreground">No education levels added</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Bio</h3>
                      <p className="whitespace-pre-line">{tutorProfile.bio}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Education</h3>
                      <p className="whitespace-pre-line">{tutorProfile.education}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Experience</h3>
                      <p className="whitespace-pre-line">{tutorProfile.experience}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">No profile yet</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      You haven't created your tutor profile yet. Create a profile to start receiving student inquiries.
                    </p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                <Button onClick={handleOpenProfileDialog}>
                  {tutorProfile ? (
                    <>
                      <Edit className="mr-2 h-4 w-4" /> Edit Profile
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Profile
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Ads Tab */}
          <TabsContent value="ads">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Class Ads</CardTitle>
                  <CardDescription>
                    Create and manage your class advertisements
                  </CardDescription>
                </div>
                
                <Dialog open={adDialogOpen} onOpenChange={setAdDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Ad
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Class Ad</DialogTitle>
                      <DialogDescription>
                        Create a new advertisement for your classes
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...adForm}>
                      <form onSubmit={adForm.handleSubmit((data) => createAdMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={adForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Math Tutoring for High School Students" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={adForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe your class, teaching style, and what students can expect"
                                  className="min-h-[120px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={adForm.control}
                            name="subjectId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select subject" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {subjects?.map((subject) => (
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
                            name="levelId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Education Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {educationLevels?.map((level) => (
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
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={adForm.control}
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
                            control={adForm.control}
                            name="teachingMode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Teaching Mode</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="online">Online</SelectItem>
                                    <SelectItem value="offline">In-person</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit" disabled={createAdMutation.isPending}>
                            {createAdMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create Ad"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              
              <CardContent>
                {ads && ads.length > 0 ? (
                  <div className="space-y-4">
                    {ads.map((ad) => (
                      <div key={ad.id} className="border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                          <h3 className="text-lg font-medium">{ad.title}</h3>
                          
                          <div className="flex items-center mt-2 md:mt-0">
                            <Badge variant={ad.status === "active" ? "success" : "secondary"} className="mr-4">
                              {ad.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                            
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteAdMutation.mutate(ad.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground mb-4">{ad.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {ad.subject && (
                            <Badge variant="outline">{ad.subject.name}</Badge>
                          )}
                          
                          {ad.level && (
                            <Badge variant="outline">{ad.level.name}</Badge>
                          )}
                          
                          <Badge variant="outline">
                            {ad.teachingMode === "online" ? "Online" : 
                             ad.teachingMode === "offline" ? "In-person" : 
                             "Online & In-person"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="font-medium text-secondary">
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND'
                            }).format(Number(ad.hourlyRate))}{" "}
                            <span className="text-sm font-normal text-muted-foreground">/hour</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">No ads yet</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      You haven't created any class advertisements yet. Create your first ad to attract students.
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
                <CardTitle>Messages</CardTitle>
                <CardDescription>
                  Your conversations with students
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
                          <AvatarImage src={conversation.student?.avatar} alt={conversation.student?.firstName} />
                          <AvatarFallback>
                            {conversation.student?.firstName?.[0]}{conversation.student?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {conversation.student?.firstName} {conversation.student?.lastName}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(conversation.lastMessageAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage?.content || "Start a conversation"}
                          </p>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-medium">No messages yet</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      You haven't received any messages from students yet. Complete your profile and create ads to attract students.
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
                <CardTitle>Statistics</CardTitle>
                <CardDescription>
                  Overview of your profile performance
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Profile Views</p>
                            <p className="text-2xl font-medium">{stats.profileViews}</p>
                          </div>
                          <UserCircle className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Students</p>
                            <p className="text-2xl font-medium">{stats.totalStudents}</p>
                          </div>
                          <Users className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Avg. Rating</p>
                            <div className="flex items-center">
                              <p className="text-2xl font-medium">{stats.averageRating}</p>
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
                    <h2 className="mt-4 text-xl font-medium">No statistics available</h2>
                    <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                      Statistics will be available once your profile becomes active and you start getting student interactions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Profile Dialog */}
      <Dialog modal={true} open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
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
            <form onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write about yourself, your teaching philosophy, and what makes you a great tutor"
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum 50 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <FormField
                    control={profileForm.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Education</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="List your educational background, degrees, certificates, etc."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <FormField
                    control={profileForm.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your teaching experience, including number of years, institutions, achievements, etc."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
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
                          Set your standard hourly rate (VND)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={profileForm.control}
                    name="teachingMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teaching Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="offline">In-person</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How you prefer to conduct your tutoring sessions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormItem>
                    <FormLabel>Subjects</FormLabel>
                    <FormDescription>
                      Select all subjects that you can teach
                    </FormDescription>
                    
                    <div className="mt-2">
                      <CheckboxGroup
                        value={selectedSubjects}
                        onValueChange={setSelectedSubjects}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {subjects?.map((subject) => (
                            <div key={subject.id}>
                              <CheckboxItem 
                                id={`subject-${subject.id}`}
                                value={subject.id.toString()}
                                checked={selectedSubjects.includes(subject.id.toString())}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedSubjects(prev => [...prev, subject.id.toString()]);
                                  } else {
                                    setSelectedSubjects(prev => prev.filter(id => id !== subject.id.toString()));
                                  }
                                }}
                                label={subject.name}
                              />
                            </div>
                          ))}
                        </div>
                      </CheckboxGroup>
                    </div>
                    
                    {selectedSubjects.length === 0 && (
                      <p className="text-sm text-destructive mt-2">
                        Please select at least one subject
                      </p>
                    )}
                  </FormItem>
                </div>
                
                <div>
                  <FormItem>
                    <FormLabel>Education Levels</FormLabel>
                    <FormDescription>
                      Select all education levels you can teach
                    </FormDescription>
                    
                    <div className="mt-2">
                      <CheckboxGroup
                        value={selectedLevels}
                        onValueChange={setSelectedLevels}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {educationLevels?.map((level) => (
                            <div key={level.id}>
                              <CheckboxItem 
                                id={`level-${level.id}`}
                                value={level.id.toString()}
                                checked={selectedLevels.includes(level.id.toString())}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedLevels(prev => [...prev, level.id.toString()]);
                                  } else {
                                    setSelectedLevels(prev => prev.filter(id => id !== level.id.toString()));
                                  }
                                }}
                                label={level.name}
                              />
                            </div>
                          ))}
                        </div>
                      </CheckboxGroup>
                    </div>
                    
                    {selectedLevels.length === 0 && (
                      <p className="text-sm text-destructive mt-2">
                        Please select at least one education level
                      </p>
                    )}
                  </FormItem>
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
                  {profileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tutorProfile ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    tutorProfile ? "Update Profile" : "Create Profile"
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
