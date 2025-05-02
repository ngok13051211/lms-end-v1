import { Subject } from "@shared/schema";
import { 
  Calculator, 
  Atom, 
  FlaskRound, 
  Globe2, 
  BookOpen, 
  BarChart2, 
  MoreHorizontal 
} from "lucide-react";

interface SubjectCardProps {
  subject: Subject;
}

export default function SubjectCard({ subject }: SubjectCardProps) {
  // Map subject name to icon
  const getSubjectIcon = () => {
    const nameToLower = subject.name.toLowerCase();
    
    if (nameToLower.includes("toán")) return <Calculator className="text-primary text-2xl" />;
    if (nameToLower.includes("lý")) return <Atom className="text-primary text-2xl" />;
    if (nameToLower.includes("hóa")) return <FlaskRound className="text-primary text-2xl" />;
    if (nameToLower.includes("anh")) return <Globe2 className="text-primary text-2xl" />;
    if (nameToLower.includes("văn")) return <BookOpen className="text-primary text-2xl" />;
    if (nameToLower.includes("sử") || nameToLower.includes("lịch")) return <BarChart2 className="text-primary text-2xl" />;
    
    return <MoreHorizontal className="text-primary text-2xl" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 text-center transition-transform duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
      <div className="bg-primary-light bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
        {getSubjectIcon()}
      </div>
      <h3 className="font-medium">{subject.name}</h3>
      <p className="text-muted-foreground text-sm mt-1">
        {subject.tutorCount} gia sư
      </p>
    </div>
  );
}
