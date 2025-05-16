import { useState, useEffect } from "react";
import { useLocation, useParams, Route } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { clearRegistration } from "@/features/auth/authSlice";
import { RootState } from "@/store";
import verificationService from "@/features/auth/verificationService";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import MainLayout from "@/components/layout/MainLayout";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot
} from "@/components/ui/input-otp";
import { Link } from "wouter";

// OTP verification schema with Zod
const otpVerificationSchema = z.object({
    otp: z
        .string()
        .length(6, "Mã OTP phải gồm 6 chữ số")
        .regex(/^\d{6}$/, "Mã OTP chỉ được chứa chữ số"),
});

type OtpVerificationFormValues = z.infer<typeof otpVerificationSchema>;

export default function VerifyEmail() {
    const [, navigate] = useLocation();
    const { email } = useParams();
    const { toast } = useToast();
    const dispatch = useDispatch();
    const { registrationEmail } = useSelector((state: RootState) => state.auth);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [isVerified, setIsVerified] = useState(false);
    const decodedEmail = email ? decodeURIComponent(email) : "";

    // Form setup with React Hook Form and Zod validation
    const form = useForm<OtpVerificationFormValues>({
        resolver: zodResolver(otpVerificationSchema),
        defaultValues: {
            otp: "",
        },
    });
    // Countdown timer for resend button
    useEffect(() => {
        if (secondsLeft <= 0) return;

        const timer = setTimeout(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [secondsLeft]);    // Auto-send OTP when page loads
    useEffect(() => {
        if (decodedEmail) {
            // Send OTP and start cooldown
            verificationService.sendOtp(decodedEmail)
                .then(response => {
                    if (response.success) {
                        toast({
                            title: "Mã OTP đã được gửi",
                            description: "Vui lòng kiểm tra email của bạn để nhận mã xác thực.",
                        });
                        setSecondsLeft(60);
                    } else if (response.rateLimited) {
                        // Xử lý trường hợp bị giới hạn tốc độ (đã có OTP được gửi gần đây)
                        toast({
                            title: "Thông báo",
                            description: response.message || "Mã OTP đã được gửi trước đó. Vui lòng kiểm tra email của bạn.",
                        });
                        setSecondsLeft(60); // Vẫn đặt thời gian chờ để tránh gửi nhiều yêu cầu
                    }
                })
                .catch(error => {
                    console.error("Error sending initial OTP:", error);
                    toast({
                        title: "Không thể gửi OTP",
                        description: error.message || "Đã xảy ra lỗi khi gửi OTP. Vui lòng sử dụng nút gửi lại OTP.",
                        variant: "destructive",
                    });
                });
        }
    }, [decodedEmail, toast]);
    // Handle OTP verification submission
    const onSubmit = async (data: OtpVerificationFormValues) => {
        if (!decodedEmail) {
            toast({
                title: "Lỗi xác thực",
                description: "Không tìm thấy email để xác thực. Vui lòng thử lại.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await verificationService.verifyOtp(decodedEmail, data.otp); if (response.success) {
                setIsVerified(true);
                toast({
                    title: "Xác thực thành công",
                    description: "Email của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.",
                });

                // Clear registration email from store if it exists
                if (registrationEmail) {
                    dispatch(clearRegistration());
                }

                // Redirect to login after a short delay
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else {
                toast({
                    title: "Xác thực không thành công",
                    description: response.message || "Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            console.error("OTP verification error:", error);
            toast({
                title: "Lỗi xác thực",
                description: error.message || "Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại sau.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    // Handle resend OTP
    const handleResendOtp = async () => {
        if (!decodedEmail) {
            toast({
                title: "Lỗi gửi OTP",
                description: "Không tìm thấy email để gửi OTP. Vui lòng thử lại.",
                variant: "destructive",
            });
            return;
        }

        setIsResending(true);
        try {
            const response = await verificationService.sendOtp(decodedEmail);

            if (response.success) {
                toast({
                    title: "Gửi mã OTP thành công",
                    description: "Mã OTP mới đã được gửi đến email của bạn.",
                });

                // Set 60-second cooldown for resend button
                setSecondsLeft(60);
            } else {
                toast({
                    title: "Không thể gửi OTP",
                    description: response.message || "Đã xảy ra lỗi khi gửi OTP. Vui lòng thử lại sau.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            console.error("Resend OTP error:", error);
            toast({
                title: "Lỗi gửi OTP",
                description: error.message || "Đã xảy ra lỗi trong quá trình gửi OTP. Vui lòng thử lại sau.",
                variant: "destructive",
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <MainLayout>
            <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
                <Card className="w-full max-w-md mx-auto">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold">Xác minh email</CardTitle>
                        <CardDescription>
                            Nhập mã OTP gồm 6 chữ số đã được gửi đến email của bạn
                        </CardDescription>
                        {decodedEmail && (
                            <div className="mt-1 text-sm font-medium text-primary">
                                {decodedEmail}
                            </div>
                        )}
                    </CardHeader>

                    <CardContent>
                        {isVerified ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6">
                                <div className="rounded-full bg-green-100 p-3">
                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-medium">Xác minh thành công!</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Email của bạn đã được xác minh. Đang chuyển hướng đến trang đăng nhập...
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
                                            <FormItem>
                                                <FormLabel>Mã xác thực OTP</FormLabel>
                                                <FormControl>
                                                    <InputOTP
                                                        maxLength={6}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        // render={({ slots }) => (
                                                        //   <InputOTPGroup>
                                                        //     {slots.map((slot, index) => (
                                                        //       <InputOTPSlot key={index} index={index} className="rounded-md" />
                                                        //     ))}
                                                        //   </InputOTPGroup>
                                                        // )}
                                                        render={({ slots }) => (
                                                            <InputOTPGroup>
                                                                {slots.map((slot, index) => (
                                                                    <InputOTPSlot key={index} slot={slot} />
                                                                ))}
                                                            </InputOTPGroup>
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-4">
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={isLoading}
                                        >
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Xác minh
                                        </Button>

                                        <div className="text-center">
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
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-center">
                        <div className="text-center text-sm">
                            <Link href="/login" className="text-primary hover:underline">
                                Quay lại trang đăng nhập
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </MainLayout>
    );
}
