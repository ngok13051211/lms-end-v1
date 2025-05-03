import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Clock, Book, Award, Star, MapPin, Users, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import TutorCard from "@/components/ui/TutorCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TutorProfile() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Get tutor details
  const { data: tutor, isLoading: tutorLoading } = useQuery({
    queryKey: [`/api/v1/tutors/${id}`],
  });
  
  // Get tutor's ads
  const { data: tutorAds, isLoading: adsLoading } = useQuery({
    queryKey: [`/api/v1/tutors/${id}/ads`],
  });
  
  // Get tutor's reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: [`/api/v1/tutors/${id}/reviews`],
  });
  
  // Get similar tutors
  const { data: similarTutors, isLoading: similarLoading } = useQuery({
    queryKey: [`/api/v1/tutors/similar/${id}`],
    enabled: !!tutor,
  });
  
  // Check if tutor is in favorites
  const { data: checkFavoriteData, isLoading: checkFavoriteLoading } = useQuery({
    queryKey: [`/api/v1/students/favorite-tutors/check/${id}`],
    enabled: !!user && user.role === 'student',
    onSuccess: (data) => {
      setIsFavorite(data?.isFavorite || false);
    },
  });
  
  // Add tutor to favorites
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/v1/students/favorite-tutors/${id}`);
    },
    onSuccess: () => {
      setIsFavorite(true);
      toast({
        title: "Đã thêm vào danh sách yêu thích",
        description: "Gia sư đã được thêm vào danh sách yêu thích của bạn.",
        variant: "default",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/v1/students/favorite-tutors/check/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/students/favorite-tutors'] });
    },
    onError: (error) => {
      console.error("Error adding to favorites:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm gia sư vào danh sách yêu thích.",
        variant: "destructive",
      });
    }
  });
  
  // Remove tutor from favorites
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/v1/students/favorite-tutors/${id}`);
    },
    onSuccess: () => {
      setIsFavorite(false);
      toast({
        title: "Đã xóa khỏi danh sách yêu thích",
        description: "Gia sư đã được xóa khỏi danh sách yêu thích của bạn.",
        variant: "default",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/v1/students/favorite-tutors/check/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/students/favorite-tutors'] });
    },
    onError: (error) => {
      console.error("Error removing from favorites:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa gia sư khỏi danh sách yêu thích.",
        variant: "destructive",
      });
    }
  });
  
  // Handle favorite toggle
  const toggleFavorite = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (isFavorite) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };
  
  const isLoading = tutorLoading || adsLoading || reviewsLoading;
  
  // Redirect if tutor not found
  useEffect(() => {
    if (!tutorLoading && !tutor) {
      navigate("/tutors");
    }
  }, [tutor, tutorLoading, navigate]);
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading tutor profile...</span>
        </div>
      </MainLayout>
    );
  }
  
  if (!tutor) return null;
  
  // Start a conversation with the tutor
  const startConversation = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    try {
      // Create or retrieve conversation
      const response = await fetch(`/api/v1/conversations/tutor/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        navigate(`/dashboard/student/messages/${data.conversationId}`);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };
  
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Tutor Profile Header */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center">
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage 
                      src={tutor.user?.avatar} 
                      alt={tutor.user?.name || (tutor.user?.first_name ? `${tutor.user.first_name} ${tutor.user.last_name}` : "Tutor")} 
                    />
                    <AvatarFallback className="text-2xl">
                      {tutor.user?.name ? tutor.user.name[0] : 
                       (tutor.user?.first_name ? `${tutor.user.first_name[0]}${tutor.user.last_name?.[0] || ''}` : "T")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="ml-0 md:ml-6 mt-4 md:mt-0 flex-1">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                      <h1 className="text-2xl md:text-3xl font-medium">
                        {tutor.user?.name || (tutor.user?.first_name ? `${tutor.user.first_name} ${tutor.user.last_name}` : "Tutor")}
                      </h1>
                      
                      <div className="flex items-center mt-2 md:mt-0">
                        <Star className="h-5 w-5 text-warning" fill="currentColor" />
                        <span className="ml-1 text-lg font-medium">{tutor.rating}</span>
                        <span className="text-gray-500 ml-1">({tutor.total_reviews || 0} reviews)</span>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground">{tutor.education}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {tutor.subjects?.map((subject) => (
                        <Badge key={subject.id} className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30">
                          {subject.name}
                        </Badge>
                      ))}
                      
                      {tutor.teaching_mode === "online" && (
                        <Badge className="bg-success-light/20 text-success-dark hover:bg-success-light/30">
                          <MapPin className="h-3 w-3 mr-1" /> Online
                        </Badge>
                      )}
                      
                      {tutor.teaching_mode === "offline" && (
                        <Badge className="bg-warning-light/20 text-warning-dark hover:bg-warning-light/30">
                          <MapPin className="h-3 w-3 mr-1" /> In-person
                        </Badge>
                      )}
                      
                      {tutor.teaching_mode === "both" && (
                        <Badge className="bg-info-light/20 text-info-dark hover:bg-info-light/30">
                          <MapPin className="h-3 w-3 mr-1" /> Online & In-person
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{tutor.experience}</span>
                  </div>
                  
                  <div className="flex items-center text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{tutor.levels?.map(level => level.name).join(", ")}</span>
                  </div>
                  
                  {tutor.is_verified && (
                    <div className="flex items-center text-success">
                      <Award className="h-4 w-4 mr-1" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Tabs Section */}
            <Tabs defaultValue="about" className="mb-8">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="ads">Class Ads ({tutorAds?.length || 0})</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({tutor.total_reviews || 0})</TabsTrigger>
              </TabsList>
              
              {/* About Tab */}
              <TabsContent value="about" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-medium mb-4">About Me</h2>
                    <p className="whitespace-pre-line">{tutor.bio}</p>
                    
                    <Separator className="my-6" />
                    
                    <h2 className="text-xl font-medium mb-4">Education</h2>
                    <p className="whitespace-pre-line">{tutor.education}</p>
                    
                    <Separator className="my-6" />
                    
                    <h2 className="text-xl font-medium mb-4">Experience</h2>
                    <p className="whitespace-pre-line">{tutor.experience}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Ads Tab */}
              <TabsContent value="ads" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    {tutorAds && tutorAds.length > 0 ? (
                      <div className="grid gap-6">
                        {tutorAds.map((ad) => (
                          <div key={ad.id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                            <h3 className="text-lg font-medium mb-2">{ad.title}</h3>
                            <p className="text-muted-foreground mb-4">{ad.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {ad.subject && (
                                <Badge className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30">
                                  {ad.subject.name}
                                </Badge>
                              )}
                              
                              {ad.level && (
                                <Badge className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30">
                                  {ad.level.name}
                                </Badge>
                              )}
                              
                              <Badge className="bg-secondary-light/20 text-secondary-dark hover:bg-secondary-light/30">
                                {ad.teaching_mode === "online" ? "Online" : 
                                 ad.teaching_mode === "offline" ? "In-person" : 
                                 "Online & In-person"}
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-secondary">
                                {new Intl.NumberFormat('vi-VN', { 
                                  style: 'currency', 
                                  currency: 'VND' 
                                }).format(Number(ad.hourly_rate))}<span className="text-sm text-muted-foreground">/hour</span>
                              </span>
                              
                              <Button onClick={startConversation} className="bg-primary hover:bg-primary-dark">
                                Contact Tutor
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Book className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">
                          This tutor has not published any class ads yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Reviews Tab */}
              <TabsContent value="reviews" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    {reviews && reviews.length > 0 ? (
                      <div className="space-y-6">
                        {reviews.map((review) => (
                          <div key={review.id} className="border-b pb-6 last:border-b-0">
                            <div className="flex items-start mb-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage 
                                  src={review.student?.avatar} 
                                  alt={review.student?.name || (review.student?.first_name ? `${review.student.first_name} ${review.student.last_name}` : "Student")} 
                                />
                                <AvatarFallback>
                                  {review.student?.name ? review.student.name[0] : 
                                   (review.student?.first_name ? `${review.student.first_name[0]}${review.student.last_name?.[0] || ''}` : "S")}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="ml-3">
                                <div className="flex items-center">
                                  <h4 className="font-medium">
                                    {review.student?.name || (review.student?.first_name ? `${review.student.first_name} ${review.student.last_name}` : "Student")}
                                  </h4>
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                
                                <div className="flex text-warning mt-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className="h-4 w-4"
                                      fill={i < review.rating ? "currentColor" : "none"}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-muted-foreground">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">
                          This tutor has not received any reviews yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar */}
          <div>
            {/* Contact Card */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium mb-4">
                  Contact {tutor.user?.name || (tutor.user?.first_name ? `${tutor.user.first_name}` : "Tutor")}
                </h3>
                
                <div className="mb-6">
                  <p className="text-muted-foreground mb-2">Hourly Rate:</p>
                  <p className="text-2xl font-medium text-secondary">
                    {new Intl.NumberFormat('vi-VN', { 
                      style: 'currency', 
                      currency: 'VND' 
                    }).format(Number(tutor.hourly_rate))}
                    <span className="text-sm text-muted-foreground font-normal">/hour</span>
                  </p>
                </div>
                
                <Button onClick={startConversation} className="w-full mb-3">
                  <Mail className="mr-2 h-4 w-4" /> Message Tutor
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Usually responds within 24 hours
                </p>
              </CardContent>
            </Card>
            
            {/* Similar Tutors */}
            {!similarLoading && similarTutors && similarTutors.length > 0 && (
              <div>
                <h3 className="text-xl font-medium mb-4">Similar Tutors</h3>
                <div className="space-y-4">
                  {similarTutors.slice(0, 3).map((tutor) => (
                    <TutorCard key={tutor.id} tutor={tutor} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
