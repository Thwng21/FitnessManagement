"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import {
    TrendingUp, TrendingDown, Activity, Flame, Calendar, Camera,
    Weight, Target, CheckCircle2, Award, Loader2, ArrowUpRight, ArrowDownRight,
    Sparkles, Dumbbell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfYear, endOfYear } from "date-fns";
import { vi } from "date-fns/locale";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface HealthRecord {
    date: string;
    weight: number;
    calories: number;
    running_distance: number;
    activities: { name: string; calories: number; duration: number }[];
    protein: number;
    carbs: number;
    fat: number;
}

interface WorkoutRecord {
    date: string;
    exercises: { completed: boolean; sets: number; reps: number; weight: number }[];
}

interface PhotoRecord {
    date: string;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function StatsPage() {
    const [healthData, setHealthData] = useState<HealthRecord[]>([]);
    const [workoutsData, setWorkoutsData] = useState<WorkoutRecord[]>([]);
    const [photosData, setPhotosData] = useState<PhotoRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [healthRes, workoutRes, photoRes] = await Promise.all([
                    api.get("/health"),
                    api.get("/workouts"),
                    api.get("/photos")
                ]);
                setHealthData(Array.isArray(healthRes.data) ? healthRes.data : []);
                setWorkoutsData(Array.isArray(workoutRes.data) ? workoutRes.data : []);
                setPhotosData(Array.isArray(photoRes.data) ? photoRes.data : []);
            } catch (err) {
                console.error("Failed to fetch stats data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ─── DATA PROCESSING ─────────────────────────────────────────────────────────

    // 1. Weight Chart Data (Last 30 entries)
    const weightTrendData = useMemo(() => {
        return healthData
            .filter(h => h.weight > 0)
            .slice(-30)
            .map(h => ({
                date: format(parseISO(h.date), "dd/MM"),
                weight: h.weight
            }));
    }, [healthData]);

    // 2. Calories Balance (Last 7 days)
    const caloriesData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(new Date(), i);
            const key = format(d, "yyyy-MM-dd");
            const h = healthData.find(record => record.date === key);

            const intake = h?.calories || 0;
            const runningBurn = (h?.running_distance || 0) * 60;
            const activityBurn = (h?.activities || []).reduce((acc, a) => acc + (a.calories || 0), 0);
            const totalBurned = runningBurn + activityBurn;

            return {
                name: format(d, "EE", { locale: vi }),
                nạp: intake,
                tiêu_thụ: totalBurned,
                date: key
            };
        }).reverse();
        return last7Days;
    }, [healthData]);

    // 3. Nutrition Distribution (Average)
    const nutritionDistribution = useMemo(() => {
        const total = healthData.reduce((acc, h) => ({
            p: acc.p + (h.protein || 0),
            c: acc.c + (h.carbs || 0),
            f: acc.f + (h.fat || 0)
        }), { p: 0, c: 0, f: 0 });

        const totalGrams = total.p + total.c + total.f || 1;
        return [
            { name: "Đạm (Protein)", value: total.p, color: "#f87171" },
            { name: "Tinh bột (Carbs)", value: total.c, color: "#fbbf24" },
            { name: "Chất béo (Fat)", value: total.f, color: "#60a5fa" }
        ];
    }, [healthData]);

    // 4. Workout Consistency (Monthly)
    const workoutConsistency = useMemo(() => {
        // Group workouts by month
        const months: Record<string, number> = {};
        workoutsData.forEach(w => {
            const m = format(parseISO(w.date), "MMM yyyy", { locale: vi });
            months[m] = (months[m] || 0) + 1;
        });
        return Object.entries(months).map(([name, count]) => ({ name, buổi: count })).slice(-6);
    }, [workoutsData]);

    // 5. Total Metrics
    const totalVolume = useMemo(() => {
        return workoutsData.reduce((acc, w) => {
            return acc + (w.exercises || []).reduce((exAcc, ex) => exAcc + (ex.sets * ex.reps * ex.weight), 0);
        }, 0);
    }, [workoutsData]);

    // Date Range Helpers
    const getWeeklyRange = () => {
        const end = new Date();
        const start = subDays(end, 6);
        return `${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy")}`;
    };

    const getMonthlyRange = () => {
        const d = new Date();
        return `Từ 01/${format(d, "MM/yyyy")} đến nay`;
    };

    const getYearlyRange = () => {
        return `Năm ${format(new Date(), "yyyy")}`;
    };

    // Yearly Data Aggregated by Month
    const yearlyData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = Array.from({ length: 12 }).map((_, i) => {
            const monthDate = new Date(currentYear, i, 1);
            const monthKey = format(monthDate, "yyyy-MM");

            const records = healthData.filter(h => h.date.startsWith(monthKey));
            const weights = records.filter(r => r.weight > 0);
            const avgWeight = weights.length > 0 ? weights.reduce((sum, h) => sum + h.weight, 0) / weights.length : 0;

            const totalIntake = records.reduce((sum, h) => sum + (h.calories || 0), 0);

            return {
                name: `T${i + 1}`,
                weight: avgWeight > 0 ? parseFloat(avgWeight.toFixed(1)) : null,
                nạp: totalIntake,
            };
        });
        return months;
    }, [healthData]);

    const latestWeight = healthData[healthData.length - 1]?.weight || 0;
    const initialWeight = healthData[0]?.weight || 0;
    const weightChange = latestWeight - initialWeight;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-xl font-bold animate-pulse">Đang phân tích dữ liệu...</p>
            </div>
        );
    }

    return (
        <>
            <Header />
            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">

                {/* ─── HERO HEADER ─── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Thống Kê Tổng Quan</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            Theo dõi sự tiến bộ của bạn qua các con số thực tế
                        </p>
                    </div>
                    <div className="flex items-center gap-3 p-1.5 bg-secondary/50 rounded-2xl border border-border/40">
                        <div className="px-4 py-2 bg-background rounded-xl shadow-sm border border-border/40">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Hôm nay</p>
                            <p className="font-bold">{format(new Date(), "dd/MM/yyyy")}</p>
                        </div>
                    </div>
                </div>

                {/* ─── QUICK STATS ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-primary/5 border-primary/20 overflow-hidden relative group">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Cân nặng hiện tại</p>
                                <Weight className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-3xl font-black mt-2 text-primary">{latestWeight} <span className="text-lg">kg</span></div>
                            <div className="mt-2 flex items-center gap-1.5">
                                {weightChange <= 0 ? (
                                    <span className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        <ArrowDownRight className="w-3 h-3" /> {Math.abs(weightChange).toFixed(1)}kg
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                                        <ArrowUpRight className="w-3 h-3" /> {weightChange.toFixed(1)}kg
                                    </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">so với lúc đầu</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-500/5 border-orange-500/20 overflow-hidden relative group">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Tổng buổi tập</p>
                                <Dumbbell className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="text-3xl font-black mt-2 text-orange-500">{workoutsData.length} <span className="text-lg">buổi</span></div>
                            <p className="text-xs text-muted-foreground mt-2">Dữ liệu từ lúc bắt đầu</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-500/5 border-blue-500/20 overflow-hidden relative group">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Tổng hình ảnh</p>
                                <Camera className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="text-3xl font-black mt-2 text-blue-500">{photosData.length} <span className="text-lg">ảnh</span></div>
                            <p className="text-xs text-muted-foreground mt-2 font-medium">Nhật ký cơ thể thực tế</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-500/5 border-emerald-500/20 overflow-hidden relative group">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Tổng khối lượng</p>
                                <Award className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-3xl font-black mt-2 text-emerald-500">{(totalVolume / 1000).toFixed(1)} <span className="text-lg">tấn</span></div>
                            <p className="text-xs text-muted-foreground mt-2 italic">Tổng tạ đã nâng</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── MAIN CHARTS ─── */}
                <Tabs defaultValue="monthly" className="w-full space-y-8">
                    <div className="flex justify-center">
                        <TabsList className="bg-secondary/50 p-1 rounded-2xl h-12 border border-border/40">
                            <TabsTrigger value="weekly" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Theo Tuần</TabsTrigger>
                            <TabsTrigger value="monthly" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Theo Tháng</TabsTrigger>
                            <TabsTrigger value="yearly" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Theo Năm</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="monthly" className="space-y-8 mt-0 focus-visible:outline-hidden">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2 mb-2">
                            <Calendar className="w-4 h-4" /> {getMonthlyRange()}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Biểu đồ Cân nặng */}
                            <Card className="border-border/60 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-primary" /> Xu Hướng Cân Nặng (Tháng)
                                    </CardTitle>
                                    <CardDescription>Biến động cân nặng trong tháng hiện tại</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={weightTrendData}>
                                            <defs>
                                                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Biểu đồ Năng lượng */}
                            <Card className="border-border/60 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Flame className="w-5 h-5 text-orange-500" /> Cân Bằng Năng Lượng (Tuần)
                                    </CardTitle>
                                    <CardDescription>Phân tích 7 ngày gần nhất</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={caloriesData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis dataKey="name" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'var(--secondary)', opacity: 0.4 }}
                                                contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                                            />
                                            <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                            <Bar dataKey="nạp" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="tiêu_thụ" fill="#f97316" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Phân bổ Dinh dưỡng */}
                            <Card className="border-border/60 shadow-lg lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-emerald-500" /> Phân Bổ Dinh Dưỡng
                                    </CardTitle>
                                    <CardDescription>Tỷ lệ trung bình các nhóm dưỡng chất chính (Macro)</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] flex flex-col items-center justify-center relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={nutritionDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {nutritionDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Tần suất tập luyện */}
                            <Card className="border-border/60 shadow-lg lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-purple-500" /> Tần Suất Tập Luyện
                                    </CardTitle>
                                    <CardDescription>Số buổi tập luyện được ghi nhận trong các tháng gần nhất</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={workoutConsistency}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                            <XAxis dataKey="name" scale="point" padding={{ left: 10, right: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                                            <Bar dataKey="buổi" fill="#a855f7" radius={[20, 20, 20, 20]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                        </div>
                    </TabsContent>

                    <TabsContent value="weekly" className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
                            <Calendar className="w-4 h-4" /> {getWeeklyRange()}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-border/60 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-primary">7 Ngày Vừa Qua</CardTitle>
                                    <CardDescription>Cân nặng và Calo nạp vào hàng ngày</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={caloriesData.map((d, i) => ({ ...d, weight: weightTrendData[weightTrendData.length - 7 + i]?.weight || null }))}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis dataKey="name" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis yAxisId="left" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }} />
                                            <Legend verticalAlign="top" align="right" />
                                            <Line yAxisId="left" type="monotone" dataKey="nạp" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} name="Calo Nạp" />
                                            <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} name="Cân Nặng" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="border-border/60 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-orange-500">Tiêu Thụ Năng Lượng</CardTitle>
                                    <CardDescription>Biểu đồ năng lượng đốt cháy trong tuần</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={caloriesData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis dataKey="name" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px' }} />
                                            <Area type="monotone" dataKey="tiêu_thụ" stroke="#f97316" fill="#fb923c" fillOpacity={0.2} name="Calo Tiêu Thụ" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="yearly" className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
                            <Calendar className="w-4 h-4" /> {getYearlyRange()}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-border/60 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-primary">Biến Động Cân Nặng (Theo Tháng)</CardTitle>
                                    <CardDescription>Trung bình cân nặng từng tháng trong năm</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={yearlyData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis dataKey="name" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px' }} />
                                            <Line type="stepAfter" dataKey="weight" stroke="var(--primary)" strokeWidth={4} dot={{ r: 6, fill: "var(--primary)" }} name="Cân Nặng TB" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="border-border/60 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-emerald-500">Tổng Calo Nạp Hàng Tháng</CardTitle>
                                    <CardDescription>Tích lũy năng lượng tiêu thụ qua các tháng</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={yearlyData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis dataKey="name" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <YAxis stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px' }} />
                                            <Bar dataKey="nạp" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Tổng Calo Nạp" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* ─── INSIGHTS ─── */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2 px-2">
                        <Sparkles className="w-6 h-6 text-emerald-500" /> Nhận Định Thông Minh
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex gap-4">
                            <div className="bg-emerald-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-700 text-lg">Giảm cân tích cực</h3>
                                <p className="text-emerald-900/70 text-sm mt-1">Dựa trên dữ liệu 30 ngày qua, bạn đang giảm trung bình 0.5kg/tuần. Đây là tốc độ an toàn và ổn định.</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-primary/10 border border-primary/20 flex gap-4">
                            <div className="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary-foreground text-lg">Tăng trưởng Sức mạnh</h3>
                                <p className="text-primary-foreground/70 text-sm mt-1">Tổng khối lượng tạ tập (Volume) đã tăng 15% so với tháng trước. Khả năng chịu đựng của cơ bắp đang tốt lên.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </>
    );
}