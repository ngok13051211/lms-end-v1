import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  BadgeCheck,
  BookOpen,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";

interface TeachingRequestsListProps {
  onCreateRequest: () => void;
}

export default function TeachingRequestsList({
  onCreateRequest,
}: TeachingRequestsListProps) {
  // Fetch teaching requests data
  const {
    data: teachingRequestsData,
    isLoading: requestsLoading,
    refetch,
  } = useQuery<any>({
    queryKey: [`/api/v1/tutors/teaching-requests`],
    retry: false,
    staleTime: 30000, // Giảm thời gian cache xuống 30 giây
    refetchOnWindowFocus: true, // Tự động refetch khi focus vào cửa sổ
    refetchOnMount: true, // Luôn refetch khi component được mount
  });
  // State để theo dõi khi có cập nhật mới
  const [isUpdated, setIsUpdated] = useState(false);

  // Extract the actual requests array from the response
  const teachingRequests = teachingRequestsData?.requests || [];

  // Hiệu ứng flash khi danh sách được cập nhật
  useEffect(() => {
    if (teachingRequests.length > 0) {
      setIsUpdated(true);
      const timer = setTimeout(() => setIsUpdated(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [teachingRequestsData]);

  // Helper function to get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
            <BadgeCheck className="h-3 w-3 mr-1" />
            Đã phê duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
            <Loader2 className="h-3 w-3 mr-1" />
            Đang chờ duyệt
          </span>
        );
    }
  };

  // Helper function to extract file name from URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split("/");
      return pathParts[pathParts.length - 1];
    } catch (e) {
      return url.split("/").pop() || "file";
    }
  };

  if (requestsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teachingRequests || teachingRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-lg font-medium">Bạn chưa có yêu cầu dạy học nào</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tạo yêu cầu mới để có thể bắt đầu dạy học
        </p>
        <Button variant="outline" className="mt-4" onClick={onCreateRequest}>
          <BookOpen className="mr-2 h-4 w-4" />
          Tạo yêu cầu giảng dạy
        </Button>
      </div>
    );
  }
  return (
    <div
      className={`space-y-6 transition-all duration-300 ${
        isUpdated ? "bg-primary/5 rounded-md p-4" : ""
      }`}
    >
      <div className="flex justify-between items-center">
        {teachingRequests.length > 0 && (
          <div className="text-sm text-muted-foreground flex items-center">
            <span>
              Tổng cộng: {teachingRequestsData?.total || 0} yêu cầu giảng dạy
            </span>
            {isUpdated && (
              <span className="ml-2 px-2 py-0.5 text-xs text-primary bg-primary/10 rounded-full animate-pulse">
                Đã cập nhật
              </span>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="ml-auto"
          disabled={requestsLoading}
        >
          {requestsLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Làm mới
        </Button>
      </div>

      {teachingRequests.map((request: any, index: number) => (
        <div key={index} className="border rounded-lg p-4 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Môn học
              </h3>
              <p className="font-medium">
                {request.subject?.name || "Không xác định"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Cấp học
              </h3>
              <p className="font-medium">
                {request.level?.name || "Không xác định"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Ngày yêu cầu
              </h3>
              <p>
                {request.created_at
                  ? format(new Date(request.created_at), "dd/MM/yyyy")
                  : "-"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Trạng thái
              </h3>
              <div className="mt-1">
                {getStatusBadge(request.status || "pending")}
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Giới thiệu
              </h3>
              <p className="text-sm whitespace-pre-wrap">
                {request.introduction}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Kinh nghiệm
              </h3>
              <p className="text-sm whitespace-pre-wrap">
                {request.experience}
              </p>
            </div>
          </div>

          {/* Certifications section */}
          {request.certifications && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Chứng chỉ
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(request.certifications) ? (
                  request.certifications.map((cert: string, i: number) => (
                    <a
                      key={i}
                      href={cert}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1 text-xs rounded bg-background hover:bg-accent transition-colors border"
                    >
                      <FileCheck className="h-3 w-3 mr-1" />
                      {getFileNameFromUrl(cert)}
                    </a>
                  ))
                ) : typeof request.certifications === "string" ? (
                  // Handle case where certifications might be a JSON string
                  (() => {
                    try {
                      const parsedCerts = JSON.parse(request.certifications);
                      return parsedCerts.map((cert: string, i: number) => (
                        <a
                          key={i}
                          href={cert}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center px-3 py-1 text-xs rounded bg-background hover:bg-accent transition-colors border"
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          {getFileNameFromUrl(cert)}
                        </a>
                      ));
                    } catch (e) {
                      return (
                        <p className="text-xs text-muted-foreground">
                          Không thể hiển thị chứng chỉ
                        </p>
                      );
                    }
                  })()
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Không thể hiển thị chứng chỉ
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Admin feedback if rejected */}
          {request.status?.toLowerCase() === "rejected" &&
            request.rejection_reason && (
              <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-100">
                <h4 className="font-medium text-sm flex items-center text-red-800">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Lý do từ chối
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  {request.rejection_reason}
                </p>
              </div>
            )}
        </div>
      ))}

      {/* Pagination */}
      {teachingRequestsData?.total_pages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={teachingRequestsData?.current_page <= 1}
              onClick={() => {
                const prevPage = Math.max(
                  (teachingRequestsData?.current_page || 2) - 1,
                  1
                );
                queryClient.prefetchQuery({
                  queryKey: [
                    `/api/v1/tutors/teaching-requests`,
                    { page: prevPage },
                  ],
                });
              }}
            >
              Trang trước
            </Button>

            <div className="text-sm">
              Trang {teachingRequestsData?.current_page} /{" "}
              {teachingRequestsData?.total_pages}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={
                (teachingRequestsData?.current_page || 0) >=
                (teachingRequestsData?.total_pages || 0)
              }
              onClick={() => {
                const nextPage = (teachingRequestsData?.current_page || 0) + 1;
                queryClient.prefetchQuery({
                  queryKey: [
                    `/api/v1/tutors/teaching-requests`,
                    { page: nextPage },
                  ],
                });
              }}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
