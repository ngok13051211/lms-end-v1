import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import TutorCard from "@/components/ui/TutorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Search, Filter, SlidersHorizontal } from "lucide-react";
import { Subject, EducationLevel } from "@shared/schema";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function TutorListing() {
  const [, navigate] = useLocation();
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search));
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [subjectFilter, setSubjectFilter] = useState(searchParams.get("subject") || "all");
  const [levelFilter, setLevelFilter] = useState(searchParams.get("level") || "all");
  const [modeFilter, setModeFilter] = useState(searchParams.get("mode") || "all");
  const [rateRange, setRateRange] = useState([0, 500000]);
  const [minExperienceFilter, setMinExperienceFilter] = useState("0");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [hasCertifications, setHasCertifications] = useState(false);
  const [page, setPage] = useState(1);
  
  // Get filter options
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ['/api/v1/subjects']
  });
  
  const { data: educationLevels, isLoading: levelsLoading } = useQuery<EducationLevel[]>({
    queryKey: ['/api/v1/education-levels']
  });
  
  // Build URL for tutors with filters
  const buildTutorsUrl = () => {
    const url = new URL('/api/v1/tutors', window.location.origin);
    
    if (searchTerm) url.searchParams.append('search', searchTerm);
    if (subjectFilter !== 'all') url.searchParams.append('subject', subjectFilter);
    if (levelFilter !== 'all') url.searchParams.append('level', levelFilter);
    if (modeFilter !== 'all') url.searchParams.append('mode', modeFilter);
    url.searchParams.append('minRate', rateRange[0].toString());
    url.searchParams.append('maxRate', rateRange[1].toString());
    
    // Advanced filters
    if (minExperienceFilter !== '0') url.searchParams.append('minExperience', minExperienceFilter);
    if (availabilityFilter !== 'all') url.searchParams.append('availability', availabilityFilter);
    if (hasCertifications) url.searchParams.append('hasCertifications', 'true');
    
    url.searchParams.append('page', page.toString());
    url.searchParams.append('limit', '12');
    
    return url.pathname + url.search;
  };
  
  // Get tutors with filters
  const { data: tutorData, isLoading: tutorsLoading } = useQuery({
    queryKey: [buildTutorsUrl()],
  });
  
  const tutors = tutorData?.tutors || [];
  const totalPages = tutorData?.total_pages || 1;
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (subjectFilter !== "all") params.set("subject", subjectFilter);
    if (levelFilter !== "all") params.set("level", levelFilter);
    if (modeFilter !== "all") params.set("mode", modeFilter);
    
    navigate(`/tutors?${params.toString()}`, { replace: true });
    // We intentionally don't include rateRange to keep URL clean
  }, [searchTerm, subjectFilter, levelFilter, modeFilter, navigate]);
  
  // Apply filters
  const applyFilters = () => {
    setPage(1);
  };
  
  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  const isLoading = tutorsLoading || subjectsLoading || levelsLoading;
  
  return (
    <MainLayout>
      <div className="bg-white shadow-md py-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tutors by name, subject or keywords"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="hidden lg:flex gap-2">
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Levels</SelectItem>
                    {educationLevels?.map((level) => (
                      <SelectItem key={level.id} value={level.id.toString()}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">In-person</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Filter className="mr-2 h-4 w-4" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Tutors</SheetTitle>
                    <SheetDescription>
                      Narrow down your search with these filters
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Subject</h4>
                      <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {subjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Education Level</h4>
                      <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          {educationLevels?.map((level) => (
                            <SelectItem key={level.id} value={level.id.toString()}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Teaching Mode</h4>
                      <Select value={modeFilter} onValueChange={setModeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Modes</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="offline">In-person</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Hourly Rate</h4>
                      <div className="px-2">
                        <Slider
                          defaultValue={rateRange}
                          max={1000000}
                          step={10000}
                          onValueChange={setRateRange}
                        />
                        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                          <span>
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND'
                            }).format(rateRange[0])}
                          </span>
                          <span>
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND'
                            }).format(rateRange[1])}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4" onClick={applyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <div className="hidden lg:block">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <SlidersHorizontal className="mr-2 h-4 w-4" /> More Filters
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Advanced Filters</SheetTitle>
                    <SheetDescription>
                      Refine your search with additional filters
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Hourly Rate</h4>
                      <div className="px-2">
                        <Slider
                          defaultValue={rateRange}
                          max={1000000}
                          step={10000}
                          onValueChange={setRateRange}
                        />
                        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                          <span>
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND'
                            }).format(rateRange[0])}
                          </span>
                          <span>
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND'
                            }).format(rateRange[1])}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Minimum Years of Experience</h4>
                      <Select value={minExperienceFilter} onValueChange={setMinExperienceFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Any Experience</SelectItem>
                          <SelectItem value="1">At least 1 year</SelectItem>
                          <SelectItem value="2">At least 2 years</SelectItem>
                          <SelectItem value="3">At least 3 years</SelectItem>
                          <SelectItem value="5">At least 5 years</SelectItem>
                          <SelectItem value="10">At least 10 years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Availability</h4>
                      <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select availability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Time</SelectItem>
                          <SelectItem value="weekday_morning">Weekday Mornings</SelectItem>
                          <SelectItem value="weekday_afternoon">Weekday Afternoons</SelectItem>
                          <SelectItem value="weekday_evening">Weekday Evenings</SelectItem>
                          <SelectItem value="weekend_morning">Weekend Mornings</SelectItem>
                          <SelectItem value="weekend_afternoon">Weekend Afternoons</SelectItem>
                          <SelectItem value="weekend_evening">Weekend Evenings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="certified" 
                        checked={hasCertifications}
                        onCheckedChange={setHasCertifications}
                      />
                      <Label htmlFor="certified">Chỉ giáo viên có chứng chỉ</Label>
                    </div>
                    
                    <Button className="w-full mt-4" onClick={applyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="ml-2 text-xl">Loading tutors...</span>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-light">
                Found <span className="font-medium text-primary">{tutorData?.total_count || 0} tutors</span> for your search
              </h1>
              {(searchTerm || subjectFilter !== "all" || levelFilter !== "all" || modeFilter !== "all") && (
                <p className="text-muted-foreground mt-1">
                  Filters: {searchTerm && `"${searchTerm}"`} {subjectFilter !== "all" && subjects?.find(s => s.id.toString() === subjectFilter)?.name} 
                  {levelFilter !== "all" && educationLevels?.find(l => l.id.toString() === levelFilter)?.name} 
                  {modeFilter !== "all" && modeFilter}
                </p>
              )}
            </div>
            
            {tutors.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tutors.map((tutor) => (
                    <TutorCard key={tutor.id} tutor={tutor} />
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-10">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      
                      <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-medium">No tutors found</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  We couldn't find any tutors matching your search criteria. Try adjusting your filters or search term.
                </p>
                <Button className="mt-6" onClick={() => {
                  setSearchTerm("");
                  setSubjectFilter("all");
                  setLevelFilter("all");
                  setModeFilter("all");
                  setRateRange([0, 500000]);
                  setMinExperienceFilter("0");
                  setAvailabilityFilter("all");
                  setHasCertifications(false);
                  navigate("/tutors");
                }}>
                  Clear all filters
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
