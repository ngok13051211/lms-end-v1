import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

// Interface for revenue data
interface RevenueData {
    period: string;
    revenue: number;
}

// Interface for filter parameters
interface RevenueFilters {
    type: 'day' | 'month' | 'year';
    month?: number;
    year?: number;
    fromDate?: Date;
    toDate?: Date;
}

const TutorRevenueStatistics: React.FC = () => {
    const [filters, setFilters] = useState<RevenueFilters>({
        type: 'month',
        year: new Date().getFullYear(),
    });

    // Fetch revenue statistics
    const {
        data: revenueData,
        isLoading,
        error,
        refetch,
    } = useQuery<RevenueData[]>({
        queryKey: ['tutor-revenue-stats', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('type', filters.type);

            if (filters.month) {
                params.append('month', filters.month.toString());
            }
            if (filters.year) {
                params.append('year', filters.year.toString());
            }
            if (filters.fromDate) {
                params.append('fromDate', format(filters.fromDate, 'yyyy-MM-dd'));
            }
            if (filters.toDate) {
                params.append('toDate', format(filters.toDate, 'yyyy-MM-dd'));
            }

            const response = await apiRequest('GET', `/api/v1/tutors/statistics/revenue?${params}`);
            return response.json();
        },
        enabled: true,
    });

    // Calculate total revenue
    const totalRevenue = revenueData?.reduce((sum, item) => sum + item.revenue, 0) || 0;

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    // Format period display
    const formatPeriod = (period: string) => {
        switch (filters.type) {
            case 'day':
                return format(new Date(period), 'dd/MM/yyyy');
            case 'month':
                return format(new Date(period + '-01'), 'MM/yyyy');
            case 'year':
                return format(new Date(period + '-01-01'), 'yyyy');
            default:
                return period;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Thống kê doanh thu</h2>
                    <p className="text-muted-foreground">
                        Xem thống kê doanh thu từ các buổi học đã hoàn thành
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Bộ lọc</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Type filter */}
                        <div>
                            <label className="text-sm font-medium">Loại thống kê</label>
                            <Select
                                value={filters.type}
                                onValueChange={(value: 'day' | 'month' | 'year') =>
                                    setFilters({ ...filters, type: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Theo ngày</SelectItem>
                                    <SelectItem value="month">Theo tháng</SelectItem>
                                    <SelectItem value="year">Theo năm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Year filter */}
                        <div>
                            <label className="text-sm font-medium">Năm</label>
                            <Select
                                value={filters.year?.toString()}
                                onValueChange={(value) =>
                                    setFilters({ ...filters, year: parseInt(value) })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                                        (year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Month filter (only for month type) */}
                        {filters.type === 'month' && (
                            <div>
                                <label className="text-sm font-medium">Tháng</label>
                                <Select
                                    value={filters.month?.toString() || ''}
                                    onValueChange={(value) =>
                                        setFilters({
                                            ...filters,
                                            month: value ? parseInt(value) : undefined
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tất cả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Tất cả</SelectItem>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                            <SelectItem key={month} value={month.toString()}>
                                                Tháng {month}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Date range for day type */}
                        {filters.type === 'day' && (
                            <>
                                <div>
                                    <label className="text-sm font-medium">Từ ngày</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !filters.fromDate && 'text-muted-foreground'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.fromDate ? (
                                                    format(filters.fromDate, 'dd/MM/yyyy')
                                                ) : (
                                                    <span>Chọn ngày</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={filters.fromDate}
                                                onSelect={(date) =>
                                                    setFilters({ ...filters, fromDate: date })
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Đến ngày</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !filters.toDate && 'text-muted-foreground'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.toDate ? (
                                                    format(filters.toDate, 'dd/MM/yyyy')
                                                ) : (
                                                    <span>Chọn ngày</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={filters.toDate}
                                                onSelect={(date) =>
                                                    setFilters({ ...filters, toDate: date })
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </>
                        )}
                    </div>

                    <Button onClick={() => refetch()} className="mt-4">
                        Cập nhật thống kê
                    </Button>
                </CardContent>
            </Card>

            {/* Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                            Từ {revenueData?.length || 0} khoảng thời gian
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Doanh thu trung bình</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(revenueData?.length ? totalRevenue / revenueData.length : 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Trên mỗi khoảng thời gian
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cao nhất</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(Math.max(...(revenueData?.map(item => item.revenue) || [0])))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Doanh thu cao nhất trong kỳ
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Data Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Chi tiết doanh thu</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.
                        </div>
                    ) : revenueData && revenueData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Khoảng thời gian</th>
                                        <th className="text-right py-2">Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revenueData.map((item, index) => (
                                        <tr key={index} className="border-b">
                                            <td className="py-2">{formatPeriod(item.period)}</td>
                                            <td className="text-right py-2 font-medium">
                                                {formatCurrency(item.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Không có dữ liệu doanh thu trong khoảng thời gian này.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TutorRevenueStatistics;
