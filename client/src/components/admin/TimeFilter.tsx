import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Định nghĩa kiểu dữ liệu cho bộ lọc
export type FilterType = 'day' | 'month' | 'year';

export interface TimeFilterParams {
    filterType: FilterType;
    fromDate?: Date;
    toDate?: Date;
    month?: number;
    year?: number;
}

interface TimeFilterProps {
    onApplyFilter: (params: TimeFilterParams) => void;
    className?: string;
}

export const TimeFilter: React.FC<TimeFilterProps> = ({
    onApplyFilter,
    className,
}) => {
    // Năm hiện tại làm giá trị mặc định
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() trả về 0-11

    // State lưu trữ bộ lọc
    const [filterType, setFilterType] = useState<FilterType>('month');
    const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
    const [toDate, setToDate] = useState<Date | undefined>(undefined);
    const [month, setMonth] = useState<number>(currentMonth);
    const [year, setYear] = useState<number>(currentYear);

    // Tạo mảng các năm để chọn (5 năm trước và 5 năm sau năm hiện tại)
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    // Mảng các tháng
    const months = [
        { value: 1, label: 'Tháng 1' },
        { value: 2, label: 'Tháng 2' },
        { value: 3, label: 'Tháng 3' },
        { value: 4, label: 'Tháng 4' },
        { value: 5, label: 'Tháng 5' },
        { value: 6, label: 'Tháng 6' },
        { value: 7, label: 'Tháng 7' },
        { value: 8, label: 'Tháng 8' },
        { value: 9, label: 'Tháng 9' },
        { value: 10, label: 'Tháng 10' },
        { value: 11, label: 'Tháng 11' },
        { value: 12, label: 'Tháng 12' },
    ];

    // Xử lý khi nhấn nút "Xem"
    const handleApplyFilter = () => {
        const params: TimeFilterParams = {
            filterType,
        };

        switch (filterType) {
            case 'day':
                params.fromDate = fromDate;
                params.toDate = toDate;
                break;
            case 'month':
                params.month = month;
                params.year = year;
                break;
            case 'year':
                params.year = year;
                break;
        }

        onApplyFilter(params);
    };

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle>Bộ lọc thời gian</CardTitle>
            </CardHeader>            <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                    {/* Lựa chọn kiểu lọc */}
                    <div className="grid gap-2">
                        <div className="text-sm text-muted-foreground">Kiểu lọc</div>
                        <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Kiểu lọc thời gian" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day">Theo ngày</SelectItem>
                                <SelectItem value="month">Theo tháng</SelectItem>
                                <SelectItem value="year">Theo năm</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Hiển thị các trường tùy thuộc vào kiểu lọc */}
                    {filterType === 'day' && (
                        <>
                            <div className="grid gap-2">
                                <div className="text-sm text-muted-foreground">Từ ngày</div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !fromDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {fromDate ? format(fromDate, 'dd/MM/yyyy') : "Chọn ngày bắt đầu"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={fromDate}
                                            onSelect={setFromDate}
                                            initialFocus
                                            locale={vi}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid gap-2">
                                <div className="text-sm text-muted-foreground">Đến ngày</div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !toDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {toDate ? format(toDate, 'dd/MM/yyyy') : "Chọn ngày kết thúc"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={toDate}
                                            onSelect={setToDate}
                                            initialFocus
                                            locale={vi}
                                            disabled={(date) =>
                                                fromDate ? date < fromDate : false
                                            }
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    )}

                    {filterType === 'month' && (
                        <>
                            <div className="grid gap-2">
                                <div className="text-sm text-muted-foreground">Tháng</div>
                                <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Chọn tháng" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((m) => (
                                            <SelectItem key={m.value} value={m.value.toString()}>
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <div className="text-sm text-muted-foreground">Năm</div>
                                <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Chọn năm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((y) => (
                                            <SelectItem key={y} value={y.toString()}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {filterType === 'year' && (
                        <div className="grid gap-2">
                            <div className="text-sm text-muted-foreground">Năm</div>
                            <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Chọn năm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={y.toString()}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Nút áp dụng bộ lọc */}
                    <div className="grid gap-2 ml-auto">
                        <div className="text-sm text-muted-foreground">&nbsp;</div>
                        <Button onClick={handleApplyFilter}>
                            Xem
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
