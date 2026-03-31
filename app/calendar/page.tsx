"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isBefore,
  isAfter,
  startOfToday,
  parseISO
} from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Dumbbell, Loader2, Plus, Save as SaveIcon, Trash2, X, PlusCircle, Activity, CheckCircle2, Trophy, AlertCircle, Library } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
  description?: string;
}

interface WorkoutData {
  id: string;
  title: string;
  date: string;
  status: "completed" | "in_progress" | "not_started";
  exercises: Exercise[];
}

export default function CalendarPage() {
  const TODAY = startOfToday();
  const [currentMonth, setCurrentMonth] = useState(TODAY);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"view" | "create" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Dữ liệu workouts từ Backend
  const [workouts, setWorkouts] = useState<Record<string, WorkoutData>>({});

  // Các state hỗ trợ form Tạo/Sửa Lịch Tập
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutTime, setWorkoutTime] = useState("");
  const [draftExercises, setDraftExercises] = useState<{ id: string; name: string; sets: string; reps: string; weight: string; description: string }[]>([]);

  // Thư viện bài tập
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Fetch dữ liệu từ BE
  const fetchWorkouts = useCallback(async () => {
  setLoading(true);
  try {
    const response = await api.get("/workouts");
    const data: WorkoutData[] = response.data;

    const workoutMap: Record<string, WorkoutData> = {};
    data.forEach((w) => {
      try {
        const dateKey = format(parseISO(w.date), "yyyy-MM-dd");
        workoutMap[dateKey] = w;
      } catch (e) {
        workoutMap[w.date] = w;
      }
    });

    setWorkouts(workoutMap);
  } catch (err: any) {
    // Chỉ ghi log nhẹ ở trình duyệt, không văng pop-up đỏ
    console.log("⚠️ Backend hiện không phản hồi (Network Error) hoặc chưa chạy. Hãy kiểm tra lại cổng Backend.");
  } finally {
    setLoading(false);
  }
}, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await api.get("/workouts/templates");
      setTemplates(response.data || []);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setTemplates([]);
      } else {
        console.log("⚠️ Lỗi không lấy được bài tập mẫu (Backend có thể chưa chạy).");
      }
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (template: any) => {
    setWorkoutTitle(template.title);
    const mappedExercises = template.exercises.map((ex: any) => ({
      id: `lib-${Date.now()}-${Math.random()}`,
      name: ex.name,
      sets: ex.sets.toString(),
      reps: ex.reps.toString(),
      weight: ex.weight.toString(),
      description: ex.description || ""
    }));
    setDraftExercises(mappedExercises);
    setIsLibraryModalOpen(false);
    toast.success(`Đã áp dụng giáo án: ${template.title}`);
  };

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setSheetMode("view");
    setSheetOpen(true);
  };

  const prepareFormForWorkout = (date: Date, existingWorkout?: WorkoutData) => {
    setSelectedDate(date);
    if (existingWorkout) {
      setWorkoutTitle(existingWorkout.title);
      setWorkoutTime(""); 
      setDraftExercises(existingWorkout.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets.toString(),
        reps: ex.reps.toString(),
        weight: ex.weight.toString(),
        description: ex.description || ""
      })));
      setSheetMode("edit");
    } else {
      setWorkoutTitle("");
      setWorkoutTime("");
      setDraftExercises([{ id: `new-${Date.now()}-${Math.random()}`, name: "", sets: "4", reps: "10", weight: "0", description: "" }]);
      setSheetMode("create");
    }
    setSheetOpen(true);
  };

  const addDraftExercise = () => {
    setDraftExercises([...draftExercises, { id: `new-${Date.now()}-${Math.random()}`, name: "", sets: "4", reps: "10", weight: "0", description: "" }]);
  };

  const updateDraftExercise = (id: string, field: string, value: string) => {
    setDraftExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const removeDraftExercise = (id: string) => {
    setDraftExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const handleSaveWorkout = async () => {
    if (!selectedDate) return;
    if (!workoutTitle.trim()) {
      toast.warning("Vui lòng nhập Tên buổi tập trước khi lưu!");
      return;
    }
    
    setSaving(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      await api.post("/workouts", {
        title: workoutTitle,
        date: formattedDate,
        exercises: draftExercises.map(ex => ({
          name: ex.name,
          sets: parseInt(ex.sets) || 0,
          reps: parseInt(ex.reps) || 0,
          weight: parseFloat(ex.weight) || 0,
          description: ex.description
        }))
      });
      await fetchWorkouts();
      setSheetOpen(false);
      toast.success("Đã lưu lịch tập thành công!");
    } catch (err: any) {
      console.error("Error saving workout:", err);
      toast.error("Lỗi khi lưu lịch tập: " + (err.message || "Không xác định"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkout = async () => {
    const selectedData = selectedDate ? workouts[format(selectedDate, "yyyy-MM-dd")] : null;
    if (!selectedData) return;

    try {
      await api.delete(`/workouts/${selectedData.id}`);
      await fetchWorkouts();
      setSheetOpen(false);
      setIsDeleteDialogOpen(false);
      toast.success("Đã xóa lịch tập.");
    } catch (err: any) {
      console.error("Error deleting workout:", err);
      toast.error("Lỗi khi xóa lịch tập: " + (err.message || "Không xác định"));
    }
  };

  const toggleExerciseStatus = async (exerciseId: string, completed: boolean) => {
    try {
      await api.patch(`/workouts/exercise/${exerciseId}`, { completed });
      
      // Cập nhật local state một cách bất biến (Immutable)
      setWorkouts(prev => {
        const next = { ...prev };
        for (const date in next) {
          const workout = next[date];
          const exerciseIndex = workout.exercises.findIndex(ex => ex.id === exerciseId);
          
          if (exerciseIndex !== -1) {
            // Tạo bản sao mới của mảng exercises và đối tượng workout
            const updatedExercises = [...workout.exercises];
            updatedExercises[exerciseIndex] = { 
              ...updatedExercises[exerciseIndex], 
              completed 
            };
            
            next[date] = { 
              ...workout, 
              exercises: updatedExercises 
            };
            break;
          }
        }
        return next;
      });

      if (completed) {
        toast.success("Tuyệt vời! Đã hoàn thành bài tập.");
      }
    } catch (err) {
      console.error("Failed to toggle exercise:", err);
      toast.error("Lỗi khi cập nhật trạng thái bài tập.");
    }
  };

  const getDayWorkout = (day: Date) => {
    const formatted = format(day, "yyyy-MM-dd");
    return workouts[formatted];
  };

  const calculateProgress = (workout: WorkoutData) => {
    if (!workout.exercises.length) return 0;
    const completed = workout.exercises.filter(ex => ex.completed).length;
    return Math.round((completed / workout.exercises.length) * 100);
  };

  const getRingColor = (workout: WorkoutData | null | undefined, isCurrentMonthDay: boolean, day: Date) => {
    if (!isCurrentMonthDay) return "border-transparent opacity-50 bg-background/50";
    if (!workout) return "border-border hover:border-primary/50 bg-card";
    
    const progress = calculateProgress(workout);
    if (progress === 100) return "border-green-500 bg-green-500/10";
    if (progress > 0) return "border-orange-500 bg-orange-500/10";
    
    // Nếu là ngày trong tương lai (sau ngày hiện tại) và có lịch tập
    if (isAfter(day, TODAY)) {
      return "border-cyan-500 bg-cyan-500/10";
    }

    return "border-border bg-card";
  };

  const selectedData = selectedDate ? getDayWorkout(selectedDate) : null;
  const isPastDay = selectedDate ? isBefore(selectedDate, TODAY) : false;
  const isFutureDay = selectedDate ? isAfter(selectedDate, TODAY) : false;

  return (
    <>
      <Header />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Tiêu đề & Nút thao tác */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lịch Tập Luyện</h1>
            <p className="text-muted-foreground mt-1">Quản lý và theo dõi tiến độ tập luyện của bạn.</p>
          </div>
          <Button className="gap-2 bg-primary" onClick={() => prepareFormForWorkout(TODAY)}>
            <Plus className="w-4 h-4" /> Tạo Lịch Tập Mới
          </Button>
        </div>

        <Card className="border border-border shadow-sm w-full relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/50">
            <h2 className="text-xl font-bold capitalize">
              Tháng {format(currentMonth, "M, yyyy", { locale: vi })}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-2 sm:p-5">
            <div className="w-full">
              {/* Header các ngày trong tuần */}
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center font-medium text-sm text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Lưới các ngày */}
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {calendarDays.map((day, idx) => {
                  const dayWorkout = getDayWorkout(day);
                  const isCurrentMonthDay = isSameMonth(day, monthStart);
                  const isTodayFlag = isSameDay(day, TODAY);
                  const progress = dayWorkout ? calculateProgress(dayWorkout) : 0;
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      className={`
                        group relative flex flex-col min-h-[90px] sm:min-h-[110px] border-2 rounded-xl p-2 cursor-pointer transition-all duration-200
                        ${getRingColor(dayWorkout, isCurrentMonthDay, day)}
                        ${isTodayFlag ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg" : ""}
                      `}
                    >
                      <div className="flex justify-between w-full items-start">
                        <span className={`text-sm sm:text-base font-bold ${!isCurrentMonthDay ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                          {format(day, "d")}
                        </span>
                        
                        {/* Icon trạng thái */}
                        {dayWorkout && progress === 100 && (
                          <Dumbbell className="w-4 h-4 text-green-500 hidden sm:block" />
                        )}
                        {dayWorkout && progress > 0 && progress < 100 && (
                          <div className="w-2.5 h-2.5 mt-1 rounded-full bg-orange-500 hidden sm:block animate-pulse" />
                        )}
                        {dayWorkout && progress === 0 && isAfter(day, TODAY) && (
                          <Clock className="w-4 h-4 text-cyan-500 hidden sm:block" />
                        )}
                      </div>
                      
                      {/* Tên bài và Progress Bar */}
                      {dayWorkout && isCurrentMonthDay && (
                         <div className="mt-auto w-full pt-2">
                            <p className="text-[10px] sm:text-xs font-semibold truncate text-foreground hidden sm:block mb-1.5">
                              {dayWorkout.title}
                            </p>
                            <Progress value={progress} className="h-1.5 bg-background sm:bg-transparent" />
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal / Sheet Chi Tiết Ngày Tập */}
        <Sheet open={sheetOpen} onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setTimeout(() => setSheetMode("view"), 300);
          }
        }}>
          <SheetContent 
            side={sheetMode === "create" || sheetMode === "edit" ? "bottom" : "right"}
            className={`transition-all duration-300 ${
              sheetMode === "create" || sheetMode === "edit"
                ? "max-w-none! w-screen! h-dvh! border-0 rounded-none bg-background shadow-none p-0 flex flex-col" 
                : "w-full sm:max-w-md border-l-border overflow-y-auto"
            }`}
          >
            {sheetMode === "create" || sheetMode === "edit" ? (
                <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-2 sm:px-6 pt-4">
                  <div className="flex items-center gap-2 mb-4 -ml-2">
                    <Button variant="ghost" size="sm" onClick={() => setSheetMode("view")} className="gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Quay về
                    </Button>
                  </div>

                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-3xl capitalize font-bold">
                      {sheetMode === "create" ? "Lên Lịch Tập" : "Chỉnh Sửa Lịch Tập"}
                    </SheetTitle>
                    <SheetDescription className="text-lg">
                      {selectedDate ? format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi }) : ""}
                    </SheetDescription>
                  </SheetHeader>
                
                  <div className="flex-1 space-y-8 overflow-y-auto pb-6 pr-2 custom-scrollbar px-2 sm:px-6">
                  <div className="space-y-4 bg-secondary/30 p-6 rounded-xl border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                      <div className="md:col-span-8 space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tên buổi tập</Label>
                        <Input 
                          id="title" 
                          placeholder="VD: Tập Ngực & Tay Sau" 
                          value={workoutTitle} 
                          onChange={(e) => setWorkoutTitle(e.target.value)} 
                          className="text-xl font-bold h-12 bg-background border-2 border-border/50 focus:border-primary transition-all rounded-xl"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-2">
                        <Label htmlFor="time" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Giờ tập
                        </Label>
                        <Input 
                          id="time" 
                          type="time" 
                          value={workoutTime} 
                          onChange={(e) => setWorkoutTime(e.target.value)} 
                          className="w-full bg-background h-12"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="font-bold flex items-center gap-2 text-lg sm:text-xl"><Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Danh sách bài tập</h3>
                      <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                        <Button 
                          type="button"
                          variant="outline"
                          size="sm" 
                          onClick={() => { fetchTemplates(); setIsLibraryModalOpen(true); }}
                          className="flex-1 sm:flex-none gap-2 border-primary/30 text-primary hover:bg-primary/5 h-10 sm:h-11"
                        >
                          <Library className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="text-xs sm:text-sm">Từ Thư viện</span>
                        </Button>
                        <Button size="sm" onClick={addDraftExercise} className="flex-1 sm:flex-none gap-2 bg-primary h-10 sm:h-11">
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="text-xs sm:text-sm">Thêm bài tập</span>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-8 pt-4 pb-4">
                      {draftExercises.map((ex, index) => (
                        <div key={ex.id} className="relative px-2 sm:px-6">
                          <Card className="relative group border-border hover:border-primary/50 transition-colors shadow-sm overflow-visible">
                            <div className="absolute -left-3 sm:-left-5 -top-4 w-8 h-8 sm:w-10 sm:h-10 bg-primary text-primary-foreground font-bold rounded-full flex items-center justify-center text-sm sm:text-base shadow-md z-20 border-4 border-background">
                              {index + 1}
                            </div>
                            {draftExercises.length > 1 && (
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute -top-4 -right-3 sm:-right-5 h-8 w-8 sm:h-10 sm:w-10 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-md border-4 border-background"
                                onClick={() => removeDraftExercise(ex.id)}
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </Button>
                            )}
                            <CardContent className="p-4 sm:p-6 md:p-8 space-y-5 pt-8 md:pt-8 bg-card flex flex-col rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              <div className="md:col-span-6 space-y-2">
                                <Label className="text-xs text-muted-foreground font-bold uppercase">Tên bài tập</Label>
                                <Input 
                                  placeholder="VD: Đẩy ngực ghế phẳng" 
                                  value={ex.name}
                                  onChange={(e) => updateDraftExercise(ex.id, "name", e.target.value)}
                                  className="font-medium"
                                />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label className="text-xs text-muted-foreground font-bold uppercase">Khối lượng (kg)</Label>
                                <Input 
                                  type="number" 
                                  placeholder="60" 
                                  value={ex.weight}
                                  onChange={(e) => updateDraftExercise(ex.id, "weight", e.target.value)}
                                />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label className="text-xs text-muted-foreground font-bold uppercase">Hiệp (Sets)</Label>
                                <Input 
                                  type="number" 
                                  placeholder="4" 
                                  value={ex.sets}
                                  onChange={(e) => updateDraftExercise(ex.id, "sets", e.target.value)}
                                />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label className="text-xs text-muted-foreground font-bold uppercase">Lặp (Reps)</Label>
                                <Input 
                                  type="number" 
                                  placeholder="10" 
                                  value={ex.reps}
                                  onChange={(e) => updateDraftExercise(ex.id, "reps", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-bold uppercase">Mô tả chi tiết / Ghi chú</Label>
                              <Textarea 
                                className="resize-none h-20" 
                                placeholder="VD: Lên chậm, xuống nhanh, giữ chặt form..."
                                value={ex.description}
                                onChange={(e) => updateDraftExercise(ex.id, "description", e.target.value)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-auto flex justify-end gap-3 pb-6 px-4 sm:px-10 bg-background/80 backdrop-blur-md sticky bottom-0 z-30">
                  <Button variant="ghost" className="px-8" onClick={() => setSheetMode("view")}>Hủy</Button>
                  <Button className="bg-primary px-10 gap-2 font-bold" onClick={handleSaveWorkout} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                    Lưu Lịch Tập
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <SheetHeader className="mb-6 mt-4">
                  <SheetTitle className="text-2xl capitalize">
                    {selectedDate ? format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi }) : ""}
                  </SheetTitle>
                  <SheetDescription className="text-base font-medium">
                    {selectedData?.title || "Chưa có lịch tập cho ngày này."}
                  </SheetDescription>
                </SheetHeader>

                {selectedData ? (
                  <div className="space-y-8">
                    <div className="p-4 bg-secondary/50 rounded-xl border border-border">
                      <div className="flex justify-between text-sm mb-3 font-semibold">
                        <span>Mức độ hoàn thành</span>
                        <span className={calculateProgress(selectedData) === 100 ? "text-green-500" : "text-orange-500"}>
                          {calculateProgress(selectedData)}%
                        </span>
                      </div>
                      <Progress value={calculateProgress(selectedData)} className="h-2" />
                    </div>

                    {isFutureDay && (
                      <div className="flex items-center gap-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-600 text-xs font-medium">
                        <Clock className="w-4 h-4" />
                        Chưa đến lịch tập. Bạn không thể tích chọn hoàn thành cho các ngày ở tương lai.
                      </div>
                    )}

                    <div className="space-y-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-primary" />
                        Chi tiết bài tập
                      </h3>
                      
                      <div className="space-y-3">
                        {selectedData.exercises.map((exercise) => (
                          <div 
                            key={exercise.id}
                            className="flex items-center space-x-4 border border-border p-4 rounded-xl bg-card"
                          >
                            <Checkbox 
                              checked={exercise.completed} 
                              onCheckedChange={(checked) => toggleExerciseStatus(exercise.id, !!checked)}
                              disabled={isFutureDay}
                              className="w-5 h-5 rounded-full data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <p className={`font-semibold text-sm ${exercise.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {exercise.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {exercise.sets} hiệp x {exercise.reps} lần • {exercise.weight}kg
                              </p>
                              {exercise.description && (
                                <p className="text-[10px] text-muted-foreground/70 italic mt-1.5 leading-relaxed bg-accent/30 p-2 rounded-lg border border-border/40">
                                  {exercise.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 space-y-3">
                      <Button className="w-full py-6 font-semibold gap-2" variant="outline" onClick={() => prepareFormForWorkout(selectedDate!, selectedData)}>
                         Chỉnh Sửa Lịch Tập
                      </Button>
                      <Button className="w-full py-6 font-semibold text-destructive hover:bg-destructive/10" variant="ghost" onClick={() => setIsDeleteDialogOpen(true)}>
                         Xóa Lịch Tập
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center mt-12 bg-secondary/30 rounded-2xl border border-dashed border-border">
                    <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center shadow-inner">
                      <Plus className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Ngày nghỉ ngơi</h3>
                      <p className="text-sm text-muted-foreground px-4">
                        {isPastDay 
                          ? "Bạn đã không có lịch tập nào trong ngày này."
                          : "Hiện tại không có mục tiêu luyện tập nào được lên lịch cho ngày này. Cơ bắp cũng cần nghỉ ngơi đó!"}
                      </p>
                    </div>
                    {!isPastDay && (
                      <Button className="font-semibold shadow-lg" onClick={() => prepareFormForWorkout(selectedDate!)}>
                        Lên Lịch Tập Mới
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </SheetContent>
        </Sheet>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="border-red-500/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" /> Xác nhận xóa?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác. Lịch tập của ngày này cùng toàn bộ các bài tập đã lưu sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Hủy bỏ</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteWorkout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-8"
              >
                Xác nhận Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal: Chọn từ thư viện */}
        <Dialog open={isLibraryModalOpen} onOpenChange={setIsLibraryModalOpen}>
           <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
              <div className="p-8 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tight">Thư viện Giáo án</DialogTitle>
                  <DialogDescription className="text-lg">Chọn một giáo án mẫu để áp dụng nhanh vào ngày hôm nay.</DialogDescription>
                </DialogHeader>

                {loadingTemplates ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="font-bold text-muted-foreground">Đang tải thư viện...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="py-20 bg-secondary/20 rounded-[2rem] border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
                    <Dumbbell className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-bold">Chưa có bài mẫu nào</h3>
                    <p className="text-muted-foreground px-12 mt-2">Vui lòng tạo giáo án mẫu trong trang Workout trước.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {templates.map((template) => (
                      <div 
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className="group border border-border/60 p-6 rounded-[2rem] hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-300 relative overflow-hidden"
                      >
                         <div className="flex justify-between items-start relative z-10">
                            <div>
                               <h3 className="text-xl font-black group-hover:text-primary transition-colors">{template.title}</h3>
                               <p className="text-muted-foreground text-sm mt-1">{template.exercises.length} bài tập chi tiết</p>
                               <div className="flex flex-wrap gap-2 mt-4">
                                  {template.exercises.slice(0, 3).map((ex: any, i: number) => (
                                    <span key={i} className="text-[10px] font-bold uppercase tracking-wider bg-secondary px-2 py-1 rounded-lg">
                                      {ex.name}
                                    </span>
                                  ))}
                                  {template.exercises.length > 3 && (
                                    <span className="text-[10px] font-bold text-muted-foreground py-1">+{template.exercises.length - 3} bài khác</span>
                                  )}
                               </div>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full bg-background group-hover:bg-primary group-hover:text-primary-foreground shadow-sm transition-all">
                               <Plus className="w-5 h-5" />
                            </Button>
                         </div>
                         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}

                <DialogFooter className="pt-4">
                   <Button variant="ghost" onClick={() => setIsLibraryModalOpen(false)} className="rounded-xl px-8">Đóng</Button>
                </DialogFooter>
              </div>
           </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
