import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Star, Search } from "lucide-react";
import { Link } from "wouter";
import TutorCard from "@/components/ui/TutorCard";
import { Input } from "@/components/ui/input";

export default function StudentDashboardTutors() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get favorite tutors
  const { data: favoriteTutors, isLoading } = useQuery({
    queryKey: ['/api/v1/students/favorite-tutors'],
  });
  
  // Remove from favorites
  const removeFavorite = async (tutorId: number) => {
    try {
      await apiRequest("DELETE", `/api/v1/students/favorite-tutors/${tutorId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/students/favorite-tutors'] });
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };
  
  // Filter by search query
  const filteredTutors = favoriteTutors 
    ? favoriteTutors.filter((tutor: any) => {
        const fullName = `${tutor.first_name || ''} ${tutor.last_name || ''}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return fullName.includes(searchLower) || 
               (tutor.bio && tutor.bio.toLowerCase().includes(searchLower)) ||
               (tutor.subjects && tutor.subjects.some((subject: any) => 
                 subject.name.toLowerCase().includes(searchLower)
               ));
      })
    : [];
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Đang tải...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium">Gia sư yêu thích</h1>
          <div className="flex gap-2">
            <Link href="/dashboard/student/profile">
              <Button variant="outline">Hồ sơ</Button>
            </Link>
            <Link href="/dashboard/student/messages">
              <Button variant="outline">Tin nhắn</Button>
            </Link>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm gia sư yêu thích..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Gia sư yêu thích của bạn</CardTitle>
            <CardDescription>
              Danh sách gia sư bạn đã thêm vào yêu thích
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {filteredTutors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTutors.map((tutor: any) => (
                  <div key={tutor.id} className="relative">
                    <TutorCard tutor={tutor} />
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="absolute top-2 right-2 bg-background hover:bg-destructive hover:text-white z-10"
                      onClick={() => removeFavorite(tutor.id)}
                    >
                      <Star className="h-4 w-4 fill-primary text-primary hover:fill-white hover:text-white" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-xl font-medium">Không tìm thấy kết quả</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Không tìm thấy gia sư nào phù hợp với từ khóa "{searchQuery}". Hãy thử tìm kiếm với từ khóa khác.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-xl font-medium">Chưa có gia sư yêu thích</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Bạn chưa thêm gia sư nào vào danh sách yêu thích. Tìm kiếm gia sư và nhấp vào biểu tượng ngôi sao để thêm họ vào danh sách yêu thích.
                </p>
                <Link href="/tutors">
                  <Button className="mt-6">
                    Tìm gia sư
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}