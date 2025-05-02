import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

export default function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        className={cn(
          "w-full flex items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition duration-200 focus:outline-none",
          isOpen && "border-b border-gray-200"
        )}
        onClick={onClick}
      >
        <span className="font-medium">{question}</span>
        <ChevronDown
          className={cn(
            "transform transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "bg-gray-50 px-4 py-3 overflow-hidden transition-all",
          isOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <p className="text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  );
}
