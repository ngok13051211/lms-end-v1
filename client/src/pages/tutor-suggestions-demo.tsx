import React from "react";
import TutorSuggestionsList from "@/components/ui/TutorSuggestionsList";

export default function TutorSuggestionsDemo() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Featured Tutors Demo
        </h1>

        <div className="space-y-8">
          {/* Demo without subject filter */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              All Featured Tutors
            </h2>
            <TutorSuggestionsList />
          </div>

          {/* Demo with subject filter */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Featured Tutors for Subject ID 5
            </h2>
            <TutorSuggestionsList subjectId={5} />
          </div>

          {/* Demo with custom styling */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              With Custom Styling
            </h2>
            <TutorSuggestionsList
              subjectId={3}
              className="border border-blue-200 shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
