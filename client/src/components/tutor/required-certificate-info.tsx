import { AlertCircle, FileCheck } from "lucide-react";

interface RequiredCertificateInfoProps {
  certificateCount: number;
  isUploading: boolean;
}

export function RequiredCertificateInfo({ certificateCount, isUploading }: RequiredCertificateInfoProps) {
  // Show nothing when uploading
  if (isUploading) return null;

  // Show warning when no certificates
  if (certificateCount === 0) {
    return (
      <div className="text-destructive flex items-center mt-2 p-3 border-2 border-destructive/40 bg-destructive/10 rounded animate-pulse">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        <span className="font-medium">
          Bắt buộc: Vui lòng tải lên ít nhất 1 chứng chỉ để tiếp tục
        </span>
      </div>
    );
  }

  // Show requirements overview
  return (
    <div className="mt-3 border-t pt-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center">
          <FileCheck className="h-4 w-4 mr-2 text-primary" />
          <span className="font-medium text-primary">Yêu cầu chứng chỉ:</span>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-sm">
          <li>
            <span className="font-medium">Định dạng:</span> Hỗ trợ hình ảnh (JPG, PNG) và PDF
          </li>
          <li>
            <span className="font-medium">Số lượng:</span>{" "}
            {certificateCount === 0 ? (
              <span className="text-destructive font-medium">Tối thiểu 1 chứng chỉ</span>
            ) : (
              <span>Tối thiểu 1 chứng chỉ</span>
            )}
            , tối đa 5 tệp
          </li>
          <li>
            <span className="font-medium">Kích thước:</span> Mỗi tệp không quá 5MB
          </li>
        </ul>
      </div>
    </div>
  );
}
