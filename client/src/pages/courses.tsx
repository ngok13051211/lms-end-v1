import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { useMobile } from "@/hooks/use-mobile";
import MainLayout from "@/components/layout/MainLayout";

// UI components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import { BookOpen, Home, Search, BookOpenCheck, Filter, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Courses() {
  const isMobile = useMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all_subjects");
  const [selectedLevel, setSelectedLevel] = useState("all_levels");
  const [teachingMode, setTeachingMode] = useState("all_modes");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Define types for subjects and education levels
  interface Subject {
    id: number;
    name: string;
    description?: string;
  }
  
  interface EducationLevel {
    id: number;
    name: string;
    description?: string;
  }

  // Fetch subjects
  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/v1/subjects"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch education levels
  const { data: educationLevels } = useQuery<EducationLevel[]>({
    queryKey: ["/api/v1/education-levels"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Define types for API response
  interface Ad {
    id: number;
    tutor_id: number;
    title: string;
    description: string;
    subject_id?: number;
    level_id?: number;
    hourly_rate: string | number;
    teaching_mode: "online" | "offline" | "both";
    status: string;
    created_at: string;
    updated_at: string;
    subject?: { id: number; name: string };
    level?: { id: number; name: string };
    tutor?: {
      id: number;
      user: {
        id: number;
        first_name: string;
        last_name: string;
        avatar?: string;
      }
    };
  }

  interface CoursesResponse {
    ads: Ad[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  }

  // Fetch courses (ads)
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery<CoursesResponse>({
    queryKey: ["/api/v1/courses", currentPage, searchTerm, selectedSubject, selectedLevel, teachingMode],
    queryFn: getQueryFn({ 
      on401: "throw",
      params: {
        page: currentPage,
        limit: 8,
        searchTerm: searchTerm || undefined,
        subject: selectedSubject || undefined,
        level: selectedLevel || undefined,
        teaching_mode: teachingMode || undefined
      }
    }),
  });

  // Handle filter submission
  const applyFilters = () => {
    setCurrentPage(1);
    if (isMobile) {
      setIsFilterOpen(false);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSubject("all_subjects");
    setSelectedLevel("all_levels");
    setTeachingMode("all_modes");
    setCurrentPage(1);
    if (isMobile) {
      setIsFilterOpen(false);
    }
  };
  
  // Create pagination buttons
  const renderPaginationItems = () => {
    if (!coursesData || !coursesData.pagination) return null;
    
    const { total_pages, page } = coursesData.pagination;
    const items = [];
    
    // Previous button
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            if (page > 1) setCurrentPage(page - 1);
          }}
          className={page <= 1 ? "pointer-events-none opacity-50" : ""}
        />
      </PaginationItem>
    );
    
    // First page
    if (page > 2) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(1);
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Ellipsis if needed
    if (page > 3) {
      items.push(
        <PaginationItem key="ellipsis1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Page before current if it exists
    if (page > 1) {
      items.push(
        <PaginationItem key={page - 1}>
          <PaginationLink 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(page - 1);
            }}
          >
            {page - 1}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Current page
    items.push(
      <PaginationItem key={page}>
        <PaginationLink 
          href="#" 
          isActive 
          onClick={(e) => e.preventDefault()}
        >
          {page}
        </PaginationLink>
      </PaginationItem>
    );
    
    // Page after current if it exists
    if (page < total_pages) {
      items.push(
        <PaginationItem key={page + 1}>
          <PaginationLink 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(page + 1);
            }}
          >
            {page + 1}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Ellipsis if needed
    if (page < total_pages - 2) {
      items.push(
        <PaginationItem key="ellipsis2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Last page if not current
    if (page < total_pages - 1) {
      items.push(
        <PaginationItem key={total_pages}>
          <PaginationLink 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(total_pages);
            }}
          >
            {total_pages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Next button
    items.push(
      <PaginationItem key="next">
        <PaginationNext 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            if (page < total_pages) setCurrentPage(page + 1);
          }}
          className={page >= total_pages ? "pointer-events-none opacity-50" : ""}
        />
      </PaginationItem>
    );
    
    return items;
  };
  
  const renderFilters = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="subject">Môn học</Label>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger id="subject">
            <SelectValue placeholder="Tất cả các môn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_subjects">Tất cả các môn</SelectItem>
            {subjects && subjects.length > 0 && subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id.toString()}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="level">Cấp độ</Label>
        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger id="level">
            <SelectValue placeholder="Tất cả các cấp độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_levels">Tất cả các cấp độ</SelectItem>
            {educationLevels && educationLevels.length > 0 && educationLevels.map((level) => (
              <SelectItem key={level.id} value={level.id.toString()}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="teachingMode">Hình thức dạy</Label>
        <Select value={teachingMode} onValueChange={setTeachingMode}>
          <SelectTrigger id="teachingMode">
            <SelectValue placeholder="Tất cả hình thức" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_modes">Tất cả hình thức</SelectItem>
            <SelectItem value="online">Trực tuyến</SelectItem>
            <SelectItem value="offline">Tại chỗ</SelectItem>
            <SelectItem value="both">Cả hai</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Khóa học</h1>
            <p className="text-muted-foreground mt-1">
              Tìm kiếm và đăng ký các khóa học phù hợp với nhu cầu của bạn
            </p>
          </div>
          
          <div className="flex space-x-2">
            {isMobile ? (
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Lọc</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Lọc khóa học</SheetTitle>
                    <SheetDescription>
                      Tùy chỉnh kết quả tìm kiếm của bạn với các bộ lọc sau
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    {renderFilters()}
                  </div>
                  <SheetFooter>
                    <div className="flex space-x-2 w-full">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={clearFilters}
                      >
                        Xóa lọc
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={applyFilters}
                      >
                        Áp dụng
                      </Button>
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters - desktop */}
          {!isMobile && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Filter className="h-5 w-5 mr-2" />
                    Bộ lọc
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {renderFilters()}
                  
                  <div className="flex space-x-2 mt-6">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      Xóa lọc
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={applyFilters}
                    >
                      Áp dụng
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Course listings */}
          <div className={`space-y-6 ${isMobile ? 'col-span-1' : 'col-span-3'}`}>
            {/* Mobile search */}
            {isMobile && (
              <div className="relative mb-4">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm khóa học..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            
            {isLoadingCourses ? (
              // Loading skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader className="pb-0">
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent className="pb-0 pt-4">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-4" />
                      <div className="flex space-x-2 mb-4">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : coursesData?.ads && coursesData.ads.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {coursesData.ads.map((ad: any) => (
                    <Card key={ad.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{ad.title}</CardTitle>
                      </CardHeader>
                      
                      <CardContent className="pb-3">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {ad.subject && (
                            <Badge variant="outline" className="flex items-center">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {ad.subject.name}
                            </Badge>
                          )}
                          
                          {ad.level && (
                            <Badge variant="outline" className="flex items-center">
                              <BookOpenCheck className="h-3 w-3 mr-1" />
                              {ad.level.name}
                            </Badge>
                          )}
                          
                          <Badge variant="outline" className="flex items-center">
                            <Home className="h-3 w-3 mr-1" />
                            {ad.teaching_mode === "online" ? "Trực tuyến" :
                             ad.teaching_mode === "offline" ? "Tại chỗ" :
                             ad.teaching_mode === "both" ? "Cả hai" : ""}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {ad.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {ad.tutor?.user?.avatar ? (
                              <img 
                                src={ad.tutor.user.avatar} 
                                alt={`${ad.tutor.user.first_name} ${ad.tutor.user.last_name}`}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {ad.tutor?.user?.first_name?.[0]}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {ad.tutor?.user?.first_name} {ad.tutor?.user?.last_name}
                              </p>
                            </div>
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
                      
                      <CardFooter className="pt-0">
                        <Link href={`/tutors/${ad.tutor.id}`}>
                          <Button className="w-full">
                            Xem chi tiết
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                {coursesData.pagination && coursesData.pagination.total_pages > 1 && (
                  <Pagination className="mt-8">
                    <PaginationContent>
                      {renderPaginationItems()}
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-xl font-medium">Không tìm thấy khóa học</h2>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                  Không có khóa học nào phù hợp với tìm kiếm của bạn. Hãy thử thay đổi các bộ lọc hoặc từ khóa tìm kiếm.
                </p>
                <Button className="mt-6" onClick={clearFilters}>
                  Xóa tất cả bộ lọc
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}