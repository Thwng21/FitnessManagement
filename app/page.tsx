"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/components/layout/Header";
import { format, startOfToday } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Activity,
  Flame,
  CheckCircle2,
  Trophy,
  Camera,
  Heart,
  Ruler,
  Weight,
  Save,
  Loader2,
  PlusCircle
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CameraModal, { CapturedPhoto } from "@/components/CameraModal";
import api from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
}

interface WorkoutData {
  id: string;
  title: string;
  date: string;
  exercises: Exercise[];
}

interface HealthData {
  height: string;
  weight: string;
  heart_rate: string;
  calories: string;
  running_distance: string;
  activities: { name: string; calories: number; duration: number }[];
}

export default function Home() {
  const router = useRouter();
  const TODAY_DATE = startOfToday();
  const todayKey = format(TODAY_DATE, "yyyy-MM-dd");
  
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [stats, setStats] = useState<HealthData>({ 
    height: "", 
    weight: "", 
    heart_rate: "",
    calories: "",
    running_distance: "",
    activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [statsSaved, setStatsSaved] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dailyPhotos, setDailyPhotos] = useState<CapturedPhoto[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Workout
      const workoutData = await api.get(`/workouts?date=${todayKey}`).catch(() => null);
      setWorkout(workoutData?.data);

      // 2. Fetch Health Stats
      const response = await api.get(`/health/${todayKey}`).catch(() => null);
      if (response && response.data) {
        setStats({
          height: response.data.height?.toString() || "",
          weight: response.data.weight?.toString() || "",
          heart_rate: response.data.heart_rate?.toString() || "",
          calories: response.data.calories?.toString() || "",
          running_distance: response.data.running_distance?.toString() || "",
          activities: response.data.activities || [],
        });
      } else {
        setStats({ height: "", weight: "", heart_rate: "", calories: "", running_distance: "", activities: [] });
      }
    } catch (err) {
      console.error("Error fetching home data:", err);
    } finally {
      setLoading(false);
    }
  }, [todayKey]);

  useEffect(() => {
    setCurrentDate(new Date());
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, [fetchData]);

  const saveStats = async () => {
    try {
      await api.post("/health", {
        date: todayKey,
        height: parseFloat(stats.height) || null,
        weight: parseFloat(stats.weight) || null,
        heart_rate: parseInt(stats.heart_rate) || null,
      });
      setStatsSaved(true);
      toast.success("Đã cập nhật chỉ số sức khỏe!");
      setTimeout(() => setStatsSaved(false), 2000);
    } catch (err) {
      console.error("Error saving stats:", err);
      toast.error("Lỗi khi lưu chỉ số.");
    }
  };

  const toggleExercise = async (exerciseId: string, completed: boolean) => {
    if (!workout) return;
    try {
      await api.patch(`/workouts/exercise/${exerciseId}`, { completed });
      // Cập nhật local state
      setWorkout({
        ...workout,
        exercises: workout.exercises.map(ex => 
          ex.id === exerciseId ? { ...ex, completed } : ex
        )
      });
      if (completed) {
        toast.success("Tuyệt vời! Đã hoàn thành bài tập.");
      }
    } catch (err) {
      console.error("Error toggling exercise:", err);
      toast.error("Lỗi khi cập nhật trạng thái bài tập.");
    }
  };

  const exercises = workout?.exercises || [];
  const completedCount = exercises.filter((ex) => ex.completed).length;
  const progressPercent = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;

  // Calculat burned calories
  const runningCals = (parseFloat(stats.running_distance) || 0) * 60;
  const activityCals = (stats.activities || []).reduce((acc, a) => acc + (a.calories || 0), 0);
  const totalBurned = runningCals + activityCals;
  const netCalories = (parseInt(stats.calories) || 0) - totalBurned;
  const intakePercent = Math.min(Math.round(((parseInt(stats.calories) || 0) / 2500) * 100), 100);

  if (!currentDate) return null;

  return (
    <>
      <Header />

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col lg:grid lg:grid-cols-3 gap-8">

        {/* ① Header row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:col-span-3 order-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tổng Quan</h1>
            <p className="text-muted-foreground mt-1 capitalize">
              {format(currentDate, "EEEE, dd/MM/yyyy", { locale: vi })} • {format(currentDate, "HH:mm:ss")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center gap-2 bg-primary/15 text-primary hover:bg-primary/25 px-4 py-2 hover:scale-105 active:scale-95 rounded-full border-2 border-primary/40 transition-all font-bold shadow-[0_4px_15px_rgba(16,185,129,0.3)]"
            >
              <Camera className="w-5 h-5" />
              <span>Body Check</span>
              {dailyPhotos.length > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{dailyPhotos.length}</span>}
            </button>
            <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full border border-border shrink-0">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-sm">Chuỗi 12 Ngày!</span>
            </div>
          </div>
        </div>

        {/* ② Chỉ số hôm nay — full width */}
        <div className="lg:col-span-3 order-2">
          <Card className="border-border/60 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}
            <CardContent className="px-4 py-3 sm:px-5 sm:py-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Chỉ Số Hôm Nay</span>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2">
                    <Ruler className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">Chiều Cao</p>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={stats.height}
                          onChange={(e) => setStats({ ...stats, height: e.target.value })}
                          className="border-0 bg-transparent p-0 h-6 font-bold text-base focus-visible:ring-0 placeholder:text-muted-foreground/40 pr-8"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-xl px-3 py-2">
                    <Weight className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">Cân Nặng</p>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={stats.weight}
                          onChange={(e) => setStats({ ...stats, weight: e.target.value })}
                          className="border-0 bg-transparent p-0 h-6 font-bold text-base focus-visible:ring-0 placeholder:text-muted-foreground/40 pr-7"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
                    <Heart className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">Nhịp Tim</p>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={stats.heart_rate}
                          onChange={(e) => setStats({ ...stats, heart_rate: e.target.value })}
                          className="border-0 bg-transparent p-0 h-6 font-bold text-base focus-visible:ring-0 placeholder:text-muted-foreground/40 pr-12"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/phút</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={saveStats}
                  size="sm"
                  className={`shrink-0 h-8 px-4 rounded-xl font-bold gap-1.5 text-sm transition-all ${statsSaved ? "bg-green-500 hover:bg-green-500" : "bg-primary"}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {statsSaved ? "Đã lưu ✓" : "Lưu"}
                </Button>
              </div>

              {/* Energy Info Section */}
              <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Nạp Vào</span>
                  <span className="text-sm font-bold text-blue-500">{stats.calories || "0"} kcal</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Tiêu Thụ</span>
                  <span className="text-sm font-bold text-orange-500">{totalBurned} kcal</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Cân Bằng</span>
                  <span className={`text-sm font-bold ${netCalories >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {(netCalories >= 0 ? "+" : "") + netCalories} kcal
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Chạy Bộ</span>
                  <span className="text-sm font-bold text-purple-500">{stats.running_distance || "0"} km</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ③ Danh sách bài tập — cột trái 2/3 */}
        <Card className="lg:col-span-2 order-3 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bài Tập Hôm Nay</CardTitle>
                <CardDescription>
                  {workout ? `Tập Trung: ${workout.title}` : "Lịch trình tập luyện hàng ngày"}
                </CardDescription>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2 mt-4" />
          </CardHeader>
          <CardContent>
            {workout ? (
              <div className="space-y-4 mt-4">
                {exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center space-x-4 border border-border p-4 rounded-xl bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => toggleExercise(exercise.id, !exercise.completed)}
                  >
                    <Checkbox
                      checked={exercise.completed}
                      onCheckedChange={(checked) => toggleExercise(exercise.id, !!checked)}
                      className="w-5 h-5 rounded-full data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <div className="flex-1">
                      <p className={`font-medium text-base ${exercise.completed ? "line-through text-muted-foreground" : ""}`}>
                        {exercise.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets} hiệp x {exercise.reps} lần • {exercise.weight}kg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-secondary/20 rounded-2xl border border-dashed border-border mt-4">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center">
                   <Activity className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                   <h3 className="font-bold text-lg text-foreground">Hôm nay chưa có lịch tập</h3>
                   <p className="text-sm text-muted-foreground px-8 mt-1">Hãy lên lịch tập luyện cho hôm nay để theo dõi tiến độ của bạn.</p>
                </div>
                <Link href="/calendar">
                   <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
                      <PlusCircle className="w-4 h-4" /> Lên lịch ngay
                   </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ④ Stats nhỏ — cột phải 1/3, xếp dọc */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:col-span-1 order-4 content-start">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bài Tập Đã Xong</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount} / {exercises.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Mục tiêu hôm nay</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Calo Dự Kiến</CardTitle>
              <Flame className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workout ? (exercises.length * 80) : 0} kcal</div>
              <p className="text-xs text-muted-foreground mt-1">Dựa trên danh sách bài tập</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tổng Khối Lượng</CardTitle>
              <Activity className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0).toLocaleString()} kg
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tổng tạ nâng trong buổi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kỷ Lục Ngày</CardTitle>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount === exercises.length && exercises.length > 0 ? "1 PR mới!" : "0 PR"}</div>
              <p className="text-xs text-muted-foreground mt-1">Hoàn thành toàn bộ mục tiêu</p>
            </CardContent>
          </Card>
        </div>

      </main>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={async (images) => {
          setDailyPhotos(images);
          const today = format(new Date(), "yyyy-MM-dd");
          let successCount = 0;
          
          for (const img of images) {
            try {
              await api.post("/photos", {
                image: img.src,
                date: today,
                time: img.time,
                note: img.caption || null,
                weight: parseFloat(stats.weight) || null,
              });
              successCount++;
            } catch (err) {
              console.error("Failed to upload photo:", err);
            }
          }

          if (successCount > 0) {
            toast.success(`Đã lưu ${successCount} ảnh vào Nhật Ký trên Cloud!`);
            router.push("/photos");
          } else if (images.length > 0) {
            toast.error("Lỗi khi tải ảnh lên máy chủ.");
          }
        }}
      />
    </>
  );
}
