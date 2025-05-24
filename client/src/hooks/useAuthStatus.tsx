import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { logout } from '@/features/auth/authSlice';

export function useAuthStatus() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const dispatch = useDispatch();
  
  // Thêm state để theo dõi lần kiểm tra cuối cùng
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  
  // Kiểm tra nếu đang ở trang account-deactivated
  const isOnDeactivatedPage = location === "/account-deactivated";
  // Hàm kiểm tra trạng thái tài khoản người dùng
  const checkUserStatus = useCallback(async () => {
    try {
      // Nếu không có user hoặc đang ở trang thông báo tài khoản bị khóa 
      // hoặc đã kiểm tra trong vòng 30 giây qua, không kiểm tra lại
      const now = Date.now();
      if (!user || isOnDeactivatedPage || (now - lastCheckTime < 30000)) return;
      
      // Cập nhật thời gian kiểm tra gần nhất
      setLastCheckTime(now);
      
      const response = await fetch("/api/v1/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.status === 403) {
        const data = await response.json();
        if (data.error === "ACCOUNT_DEACTIVATED") {
          toast({
            title: "Tài khoản bị khóa",
            description: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.",
            variant: "destructive",
          });
          dispatch(logout());
          navigate("/account-deactivated");
        }
      }
    } catch (error) {
      console.error("Lỗi kiểm tra trạng thái tài khoản:", error);
    }
  }, [user, toast, navigate, dispatch, lastCheckTime, isOnDeactivatedPage]);
  // Thiết lập interval để kiểm tra trạng thái tài khoản định kỳ
  useEffect(() => {
    if (!user || isOnDeactivatedPage) return;
    
    // Không kiểm tra ngay lập tức mà đợi một chút
    const initialCheckTimeout = setTimeout(() => {
      checkUserStatus();
    }, 1000); // Đợi 1 giây trước khi kiểm tra lần đầu
    
    // Thiết lập kiểm tra định kỳ mỗi 5 phút
    const interval = setInterval(() => {
      checkUserStatus();
    }, 5 * 60 * 1000);
    
    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(interval);
    };
  }, [user, checkUserStatus, isOnDeactivatedPage]);

  return { checkUserStatus };
};
