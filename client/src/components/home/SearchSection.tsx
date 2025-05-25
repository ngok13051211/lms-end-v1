import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { subjects, educationLevels } from "@shared/schema";

// Định nghĩa các kiểu dữ liệu
type Subject = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  tutor_count?: number;
  teaching_mode?: string;
  hourly_rate?: number | string;
  created_at?: string;
  updated_at?: string;
};

type EducationLevel = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

interface SearchSectionProps {
  subjects: Subject[];
  educationLevels: EducationLevel[];
}

export default function SearchSection({
  subjects,
  educationLevels,
}: SearchSectionProps) {
  const [, navigate] = useLocation();
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (subject) params.append("subject", subject);
    if (level) params.append("level", level);
    if (mode) params.append("mode", mode);

    navigate(`/tutors?${params.toString()}`);
  };

  return (
    // <section className="py-8 bg-white shadow-md sticky top-16 z-40">
    //   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    //     <div className="bg-white rounded-lg p-4">
    //       <h2 className="text-center text-2xl font-medium mb-6">
    //         Tìm gia sư phù hợp với nhu cầu của bạn
    //       </h2>

    //       <div className="flex flex-wrap -mx-2">
    //         <div className="w-full md:w-1/4 px-2 mb-4 md:mb-0">
    //           <Select value={subject} onValueChange={setSubject}>
    //             <SelectTrigger className="w-full">
    //               <SelectValue placeholder="Môn học" />
    //             </SelectTrigger>
    //             <SelectContent>
    //               {subjects.map((subject) => (
    //                 <SelectItem key={subject.id} value={subject.id.toString()}>
    //                   {subject.name}
    //                 </SelectItem>
    //               ))}
    //             </SelectContent>
    //           </Select>
    //         </div>

    //         <div className="w-full md:w-1/4 px-2 mb-4 md:mb-0">
    //           <Select value={level} onValueChange={setLevel}>
    //             <SelectTrigger className="w-full">
    //               <SelectValue placeholder="Cấp học" />
    //             </SelectTrigger>
    //             <SelectContent>
    //               {educationLevels.map((level) => (
    //                 <SelectItem key={level.id} value={level.id.toString()}>
    //                   {level.name}
    //                 </SelectItem>
    //               ))}
    //             </SelectContent>
    //           </Select>
    //         </div>

    //         <div className="w-full md:w-1/4 px-2 mb-4 md:mb-0">
    //           <Select value={mode} onValueChange={setMode}>
    //             <SelectTrigger className="w-full">
    //               <SelectValue placeholder="Hình thức học" />
    //             </SelectTrigger>
    //             <SelectContent>
    //               <SelectItem value="online">Trực tuyến</SelectItem>
    //               <SelectItem value="offline">Tại nhà</SelectItem>
    //               <SelectItem value="both">Cả hai</SelectItem>
    //             </SelectContent>
    //           </Select>
    //         </div>

    //         <div className="w-full md:w-1/4 px-2">
    //           <Button
    //             className="w-full bg-primary hover:bg-primary-dark"
    //             onClick={handleSearch}
    //           >
    //             <Search className="mr-2 h-4 w-4" /> Tìm kiếm
    //           </Button>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </section>
    <></>
  );
}
