import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import verificationService from "@/features/auth/verificationService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// OTP verification schema with Zod
const otpVerificationSchema = z.object({
  otp: z
    .string()
    .length(6, "Mã OTP phải gồm 6 chữ số")
    .regex(/^\d{6}$/, "Mã OTP chỉ được chứa chữ số"),
});

type OtpVerificationFormValues = z.infer<typeof otpVerificationSchema>;

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onSuccess?: () => void;
}

export default function OtpVerificationModal({
  isOpen,
  onClose,
  email,
  onSuccess,
}: OtpVerificationModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Form setup with React Hook Form and Zod validation
  const form = useForm<OtpVerificationFormValues>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Reset form and state when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset();
      setIsVerified(false);
    }
  }, [isOpen, form]);

  // Countdown timer for resend button
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);
  // Handle OTP verification submission
  const onSubmit = async (data: OtpVerificationFormValues) => {
    if (!email) {
      toast({
        title: "Lỗi xác thực",
        description: "Không tìm thấy email để xác thực. Vui lòng thử lại.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await verificationService.verifyOtp(email, data.otp);

      if (response.success) {
        setIsVerified(true);
        toast({
          title: "Xác thực thành công",
          description: "Email của bạn đã được xác thực.",
        });

        // Call success callback after a short delay
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        toast({
          title: "Xác thực không thành công",
          description:
            response.message ||
            "Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Lỗi xác thực",
        description:
          error.message ||
          "Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (!email) {
      toast({
        title: "Lỗi gửi OTP",
        description: "Không tìm thấy email để gửi OTP. Vui lòng thử lại.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const response = await verificationService.sendOtp(email);

      if (response.success) {
        toast({
          title: "Gửi mã OTP thành công",
          description: "Mã OTP mới đã được gửi đến email của bạn.",
        });

        // Set 60-second cooldown for resend button
        setSecondsLeft(60);
      } else if (response.rateLimited) {
        // Xử lý trường hợp rate limit
        toast({
          title: "Thông báo",
          description:
            response.message ||
            "Mã OTP đã được gửi trước đó. Vui lòng kiểm tra email của bạn.",
        });

        // Vẫn đặt thời gian chờ
        setSecondsLeft(60);
      } else {
        toast({
          title: "Không thể gửi OTP",
          description:
            response.message ||
            "Đã xảy ra lỗi khi gửi OTP. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast({
        title: "Lỗi gửi OTP",
        description:
          error.message ||
          "Đã xảy ra lỗi trong quá trình gửi OTP. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Xác minh email</DialogTitle>
          <DialogDescription className="text-center">
            Nhập mã OTP gồm 6 chữ số đã được gửi đến email của bạn
          </DialogDescription>
          {email && (
            <div className="mt-1 text-sm font-medium text-center text-primary">
              {email}
            </div>
          )}
        </DialogHeader>

        {isVerified ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">Xác minh thành công!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Email của bạn đã được xác minh.
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="mx-auto">
                    <FormLabel className="text-center block">
                      Mã xác thực OTP
                    </FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                          render={({ slots }) => (
                            <InputOTPGroup>
                              {slots.map((slot, index) => (
                                <InputOTPSlot
                                  key={index}
                                  // @ts-ignore - Ignore type checking for this specific line
                                  slot={slot}
                                  className="rounded-md"
                                />
                              ))}
                            </InputOTPGroup>
                          )}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex flex-col sm:flex-col gap-2">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Xác minh
                </Button>

                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOtp}
                  disabled={isResending || secondsLeft > 0}
                  className="text-sm"
                >
                  {isResending ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : null}
                  {secondsLeft > 0
                    ? `Gửi lại mã sau ${secondsLeft} giây`
                    : "Không nhận được mã? Gửi lại OTP"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
