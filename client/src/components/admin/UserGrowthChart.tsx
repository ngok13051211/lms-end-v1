// filepath: d:\lms-end-v1\client\src\components\admin\UserGrowthChart.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, LineChart } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TimeFilterParams } from './TimeFilter';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyGrowthData {
  month: string;
  count: number;
}

interface UserGrowthChartProps {
  filterParams?: TimeFilterParams;
}

const UserGrowthChart = ({ filterParams }: UserGrowthChartProps) => {
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ labels: string[], datasets: any[] }>({
    labels: [],
    datasets: []
  });

  // Prepare URL with filter parameters
  const prepareApiUrl = () => {
    const url = new URL('/api/v1/admin/summary/statistics/user-growth-latest-12-months', window.location.origin);

    if (filterParams) {
      switch (filterParams.filterType) {
        case 'day':
          url.searchParams.append('type', 'day');
          if (filterParams.fromDate) {
            url.searchParams.append('fromDate', filterParams.fromDate.toISOString().split('T')[0]);
          }
          if (filterParams.toDate) {
            url.searchParams.append('toDate', filterParams.toDate.toISOString().split('T')[0]);
          }
          break;
        case 'month':
          url.searchParams.append('type', 'month');
          if (filterParams.month) {
            url.searchParams.append('month', filterParams.month.toString());
          }
          if (filterParams.year) {
            url.searchParams.append('year', filterParams.year.toString());
          }
          break;
        case 'year':
          url.searchParams.append('type', 'year');
          if (filterParams.year) {
            url.searchParams.append('year', filterParams.year.toString());
          }
          break;
      }
    }

    return url.pathname + url.search;
  };

  // Truy vấn dữ liệu thống kê tăng trưởng người dùng
  const {
    data: growthData,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["userGrowthStats", filterParams],
    queryFn: async () => {
      try {
        const apiUrl = prepareApiUrl();
        const response = await apiRequest("GET", apiUrl);
        const data = await response.json();
        return data as MonthlyGrowthData[];
      } catch (error) {
        console.error("Lỗi khi lấy thống kê tăng trưởng người dùng:", error);
        setError("Không thể tải thông tin tăng trưởng người dùng. Vui lòng thử lại sau.");
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 phút
  });
  useEffect(() => {
    console.log("Growth data received:", growthData);
    if (growthData && Array.isArray(growthData) && growthData.length > 0) {
      // Xử lý dữ liệu để hiển thị trên biểu đồ
      const labels = growthData.map(item => {
        // Format dates based on the length of the month string
        const parts = item.month.split('-');

        // Handle different date formats: YYYY-MM-DD or YYYY-MM
        if (parts.length === 3) {
          // This is YYYY-MM-DD format - day level
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else if (parts.length === 2) {
          // This is YYYY-MM format - month level
          const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
          return `${monthNames[parseInt(parts[1]) - 1]}/${parts[0]}`;
        }

        // Fallback
        return item.month;
      });

      const counts = growthData.map(item => item.count);

      setChartData({
        labels: labels,
        datasets: [
          {
            label: 'Người dùng mới',
            data: counts,
            backgroundColor: 'rgba(56, 189, 248, 0.2)', // Light blue area
            borderColor: 'rgb(56, 189, 248)', // Blue line
            borderWidth: 2,
            pointBackgroundColor: 'rgb(56, 189, 248)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(56, 189, 248)',
            tension: 0.4,
            fill: true,
          }
        ]
      });
    }
  }, [growthData]);

  if (isError && error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Lỗi</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  // Get chart title description based on filter params
  const getChartDescription = () => {
    if (!filterParams) {
      return "So sánh số lượng người dùng đăng ký mới trong 12 tháng gần nhất";
    }

    switch (filterParams.filterType) {
      case 'day':
        if (filterParams.fromDate && filterParams.toDate) {
          return `Thống kê người dùng mới từ ngày ${filterParams.fromDate.toLocaleDateString('vi-VN')} đến ${filterParams.toDate.toLocaleDateString('vi-VN')}`;
        } else if (filterParams.fromDate) {
          return `Thống kê người dùng mới từ ngày ${filterParams.fromDate.toLocaleDateString('vi-VN')}`;
        }
        return "Thống kê người dùng mới theo ngày";
      case 'month':
        if (filterParams.month && filterParams.year) {
          const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
          return `Thống kê người dùng mới trong ${monthNames[filterParams.month - 1]} năm ${filterParams.year}`;
        } else if (filterParams.year) {
          return `Thống kê người dùng mới trong năm ${filterParams.year}`;
        }
        return "Thống kê người dùng mới theo tháng";
      case 'year':
        if (filterParams.year) {
          return `Thống kê người dùng mới trong năm ${filterParams.year}`;
        }
        return "Thống kê người dùng mới theo năm";
      default:
        return "So sánh số lượng người dùng đăng ký mới";
    }
  };

  // Get appropriate X axis title based on filter type
  const getXAxisTitle = () => {
    if (!filterParams) return "Tháng";

    switch (filterParams.filterType) {
      case 'day': return "Ngày";
      case 'month':
        return filterParams.month ? "Ngày" : "Tháng";
      case 'year': return "Tháng";
      default: return "Tháng";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tỷ lệ người dùng mới theo thời gian</CardTitle>
        <CardDescription>
          {getChartDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {isLoading ? (
          <div className="flex flex-col space-y-3 items-center justify-center h-full">
            <Skeleton className="h-[300px] w-full" />
            <div className="flex justify-between w-full">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-12" />
              ))}
            </div>
          </div>
        ) : growthData && Array.isArray(growthData) && growthData.length > 0 ? (
          <div className="h-full w-full">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Xu hướng tăng trưởng người dùng',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0 // Hiển thị số nguyên
                    },
                    title: {
                      display: true,
                      text: 'Số lượng người dùng mới'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: getXAxisTitle()
                    }
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LineChart className="h-16 w-16 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                Không có dữ liệu tăng trưởng người dùng.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserGrowthChart;
