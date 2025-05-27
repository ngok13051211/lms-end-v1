import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'wouter';
import { logout } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle } from 'lucide-react';

const AccountDeactivated: React.FC = () => {
  const dispatch = useDispatch();

  // Xóa localStorage token để ngăn chặn các yêu cầu API trong tương lai
  React.useEffect(() => {
    localStorage.removeItem("token");
  }, []);

  const handleLogout = () => {
    // Chỉ gọi logout khi người dùng nhấp vào nút
    dispatch(logout());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md p-6 rounded-lg shadow-lg bg-card border border-border text-card-foreground">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
            <Lock size={32} />
          </div>
          
          <h2 className="text-2xl font-semibold tracking-tight">Tài khoản đã bị khóa</h2>
          
          <div className="bg-muted/50 p-3 rounded-md flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground text-left">
              Tài khoản của bạn đã bị vô hiệu hóa bởi quản trị viên. Vui lòng liên hệ với ban quản trị để biết thêm chi tiết.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ qua email:{' '}
            <a href="mailto:tranhuuloi2k3@gmail.com" className="text-primary hover:underline">
              tranhuuloi2k3@gmail.com
            </a>
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button variant="default" className="w-full" onClick={handleLogout} asChild>
            <Link href="/">
              Trở về trang chủ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountDeactivated;
