"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { format, startOfToday } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Flame, Footprints, Plus, Trash2, Save,
  Apple, Dumbbell, Heart, Ruler, Weight,
  TrendingDown, TrendingUp, Activity, X, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface BodyStats {
  weight: string;
  height: string;
  bodyFat: string;
  muscleMass: string;
  waist: string;
  chest: string;
  hip: string;
}

interface Nutrition {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  water: string;
  fiber: string;
  vitamins: string;
}

interface ActivityEntry {
  id: string;
  name: string;
  calories: string;
  duration: string;
}

interface DayData {
  body: BodyStats;
  nutrition: Nutrition;
  running: string;
  activities: ActivityEntry[];
}

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const defaultBody: BodyStats = { weight: "", height: "", bodyFat: "", muscleMass: "", waist: "", chest: "", hip: "" };
const defaultNutrition: Nutrition = { calories: "", protein: "", carbs: "", fat: "", water: "", fiber: "", vitamins: "" };
const defaultData: DayData = { body: defaultBody, nutrition: defaultNutrition, running: "", activities: [] };

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function BodyPage() {
  const TODAY_KEY = format(startOfToday(), "yyyy-MM-dd");
  
  const [data, setData] = useState<DayData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/health/${TODAY_KEY}`).catch(() => null);
      const res = response?.data;
      if (res) {
        setData({
          body: {
            weight: res.weight?.toString() || "",
            height: res.height?.toString() || "",
            bodyFat: res.body_fat?.toString() || "",
            muscleMass: res.muscle_mass?.toString() || "",
            waist: res.waist?.toString() || "",
            chest: res.chest?.toString() || "",
            hip: res.hip?.toString() || "",
          },
          nutrition: {
            calories: res.calories?.toString() || "",
            protein: res.protein?.toString() || "",
            carbs: res.carbs?.toString() || "",
            fat: res.fat?.toString() || "",
            water: res.water?.toString() || "",
            fiber: res.fiber?.toString() || "",
            vitamins: res.vitamins?.toString() || "",
          },
          running: res.running_distance?.toString() || "",
          activities: (res.activities || []).map((a: any, i: number) => ({
            id: i.toString(),
            name: a.name,
            calories: a.calories.toString(),
            duration: a.duration.toString(),
          })),
        });
      }
    } catch (err) {
      console.error("Failed to fetch health data:", err);
    } finally {
      setLoading(false);
    }
  }, [TODAY_KEY]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveAll = async () => {
    setSaving(true);
    try {
      await api.post("/health", {
        date: TODAY_KEY,
        weight: parseFloat(data.body.weight) || null,
        height: parseFloat(data.body.height) || null,
        body_fat: parseFloat(data.body.bodyFat) || null,
        muscle_mass: parseFloat(data.body.muscleMass) || null,
        waist: parseFloat(data.body.waist) || null,
        chest: parseFloat(data.body.chest) || null,
        hip: parseFloat(data.body.hip) || null,
        calories: parseInt(data.nutrition.calories) || null,
        protein: parseFloat(data.nutrition.protein) || null,
        carbs: parseFloat(data.nutrition.carbs) || null,
        fat: parseFloat(data.nutrition.fat) || null,
        water: parseFloat(data.nutrition.water) || null,
        fiber: parseFloat(data.nutrition.fiber) || null,
        vitamins: parseFloat(data.nutrition.vitamins) || null,
        running_distance: parseFloat(data.running) || null,
        activities: data.activities.map(a => ({
          name: a.name,
          calories: parseFloat(a.calories) || 0,
          duration: parseFloat(a.duration) || 0,
        })),
      });
      toast.success("Đã lưu thông tin sức khỏe thành công!");
    } catch (err) {
      console.error("Failed to save health data:", err);
      toast.error("Lỗi khi lưu thông tin sức khỏe.");
    } finally {
      setSaving(false);
    }
  };

  // State update helpers
  const setBodyStat = (key: keyof BodyStats, val: string) => setData(p => ({ ...p, body: { ...p.body, [key]: val } }));
  const setNutrition = (key: keyof Nutrition, val: string) => setData(p => ({ ...p, nutrition: { ...p.nutrition, [key]: val } }));
  const setRunning = (val: string) => setData(p => ({ ...p, running: val }));

  const addActivity = () => {
    const newAct = { id: Date.now().toString(), name: "", calories: "", duration: "" };
    setData(p => ({ ...p, activities: [...p.activities, newAct] }));
  };
  const updateActivity = (id: string, key: string, val: string) => {
    setData(p => ({ ...p, activities: p.activities.map(a => a.id === id ? { ...a, [key]: val } : a) }));
  };
  const removeActivity = (id: string) => setData(p => ({ ...p, activities: p.activities.filter(a => a.id !== id) }));

  // BMI calculation
  const getBMI = () => {
    const w = parseFloat(data.body.weight);
    const h = parseFloat(data.body.height) / 100;
    if (w && h) return (w / (h * h)).toFixed(1);
    return null;
  };

  const bmi = getBMI();
  const getBMICategory = (val: number) => {
    if (val < 18.5) return { label: "Thiếu cân", color: "text-blue-400" };
    if (val < 25) return { label: "Bình thường", color: "text-green-400" };
    if (val < 30) return { label: "Thừa cân", color: "text-yellow-400" };
    return { label: "Béo phì", color: "text-red-400" };
  };

  // Total Activity Calories
  const runningCals = (parseFloat(data.running) || 0) * 60;
  const activityCals = data.activities.reduce((acc, a) => acc + (parseFloat(a.calories) || 0), 0);
  const totalBurned = runningCals + activityCals;
  const netCalories = (parseInt(data.nutrition.calories) || 0) - totalBurned;

  const intakePercent = Math.min(Math.round(((parseInt(data.nutrition.calories) || 0) / 2500) * 100), 100);

  return (
    <>
      <Header />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="ml-3 font-bold text-lg">Đang tải dữ liệu...</span>
          </div>
        )}

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theo Dõi Thể Trạng</h1>
            <p className="text-muted-foreground mt-1 capitalize">{format(new Date(), "EEEE, dd MMMM yyyy", { locale: vi })}</p>
          </div>
          <Button onClick={saveAll} className="gap-2 bg-primary px-8 font-bold text-lg h-12 shadow-lg shadow-primary/20" disabled={saving}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Lưu Tất Cả
          </Button>
        </div>

        {/* ─── SUMMARY CARDS ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-muted-foreground">Năng lượng nạp</p>
                <Apple className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{data.nutrition.calories || "0"} kcal</div>
              <p className="text-xs text-muted-foreground mt-1">{intakePercent}% mục tiêu</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-muted-foreground">Calo tiêu thụ</p>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{totalBurned} kcal</div>
              <p className="text-xs text-muted-foreground mt-1">Từ chạy & hoạt động</p>
            </CardContent>
          </Card>
          <Card className={`border-emerald-500/20 ${netCalories >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5 border-red-500/20'}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-muted-foreground">Cân bằng</p>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{(netCalories >= 0 ? '+' : '') + netCalories} kcal</div>
              <p className="text-xs text-muted-foreground mt-1">{netCalories < 0 ? 'Đang thâm hụt' : 'Đang thặng dư'}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-muted-foreground">Chạy bộ</p>
                <Footprints className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{data.running || "0"} km</div>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ────── LEFT COLUMN ────── */}
          <div className="space-y-8">
            
            {/* Health Info */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Chỉ Số Cơ Thể
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Weight className="w-4 h-4" /> Cân nặng (kg)</Label>
                    <Input type="number" placeholder="74.5" value={data.body.weight} onChange={e => setBodyStat("weight", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Ruler className="w-4 h-4" /> Chiều cao (cm)</Label>
                    <Input type="number" placeholder="172" value={data.body.height} onChange={e => setBodyStat("height", e.target.value)} />
                  </div>
                </div>

                {bmi && (
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">BMI hiện tại</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{bmi}</span>
                        <span className={`text-sm font-medium ${getBMICategory(parseFloat(bmi)).color}`}>
                          {getBMICategory(parseFloat(bmi)).label}
                        </span>
                      </div>
                    </div>
                    {parseFloat(bmi) > 25 ? <TrendingUp className="text-yellow-500" /> : <TrendingDown className="text-green-500" />}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">% Mỡ cơ thể</Label>
                    <Input type="number" placeholder="15" value={data.body.bodyFat} onChange={e => setBodyStat("bodyFat", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Khối lượng cơ (kg)</Label>
                    <Input type="number" placeholder="32" value={data.body.muscleMass} onChange={e => setBodyStat("muscleMass", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">Số đo 3 vòng (cm)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Vòng 2 (Eo)</Label>
                      <Input type="number" placeholder="82" value={data.body.waist} onChange={e => setBodyStat("waist", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Vòng 1 (Ngực)</Label>
                      <Input type="number" placeholder="102" value={data.body.chest} onChange={e => setBodyStat("chest", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Vòng 3 (Mông)</Label>
                      <Input type="number" placeholder="95" value={data.body.hip} onChange={e => setBodyStat("hip", e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nutrition */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="w-5 h-5 text-blue-500" /> Năng Lượng Nạp Vào
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label>Tổng lượng Calo (kcal)</Label>
                    <span className="font-bold text-primary">{data.nutrition.calories || "0"}</span>
                  </div>
                  <Input type="number" placeholder="2500" value={data.nutrition.calories} onChange={e => setNutrition("calories", e.target.value)} className="text-lg font-bold h-11" />
                  <Progress value={intakePercent} className="h-2 mt-2" />
                  <p className="text-xs text-right text-muted-foreground">{intakePercent}% mục tiêu ngày</p>
                </div>

                {/* Macro Row 1 */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "protein", label: "Đạm", unit: "g", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                    { key: "carbs",   label: "Tinh Bột", unit: "g", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
                    { key: "fat",     label: "Chất Béo", unit: "g", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                  ].map(({ key, label, unit, color, bg }) => (
                    <div key={key} className={`rounded-xl border p-3 ${bg}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${color}`}>{label}</p>
                      <div className="relative">
                        <Input type="number" placeholder="0" value={data.nutrition[key as keyof Nutrition]}
                          onChange={e => setNutrition(key as keyof Nutrition, e.target.value)}
                          className="border-0 bg-transparent p-0 h-7 font-bold text-lg focus-visible:ring-0 pr-7" />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Macro Row 2: Fiber & Vitamins */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "fiber",    label: "Chất Xơ", unit: "g", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
                    { key: "vitamins", label: "Vitamin", unit: "mg", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                  ].map(({ key, label, unit, color, bg }) => (
                    <div key={key} className={`rounded-xl border p-3 ${bg}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${color}`}>{label}</p>
                      <div className="relative">
                        <Input type="number" placeholder="0" value={data.nutrition[key as keyof Nutrition]}
                          onChange={e => setNutrition(key as keyof Nutrition, e.target.value)}
                          className="border-0 bg-transparent p-0 h-7 font-bold text-lg focus-visible:ring-0 pr-7" />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Nước */}
                <div className="flex items-center gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-3">
                  <span className="text-xl">💧</span>
                  <div className="flex-1">
                    <Label className="text-xs text-cyan-600 font-bold uppercase">Lượng nước đã uống</Label>
                    <div className="relative mt-1">
                      <Input type="number" placeholder="2.5" value={data.nutrition.water} onChange={e => setNutrition("water", e.target.value)} className="border-0 bg-transparent p-0 h-7 font-bold text-lg focus-visible:ring-0 pr-8" />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">lít / 3.0 lít</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ────── RIGHT COLUMN ────── */}
          <div className="space-y-8">
            
            {/* Running */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Footprints className="w-5 h-5 text-purple-500" /> Chạy Bộ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <Label>Quãng đường (km)</Label>
                    <Input type="number" placeholder="5.2" value={data.running} onChange={e => setRunning(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Ước tính calo tiêu thụ</Label>
                    <div className="h-10 flex items-center px-4 bg-secondary/30 rounded-lg text-orange-600 font-bold uppercase tracking-tight">
                      ~ {runningCals} kcal
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other Activities */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" /> Hoạt Động Thể Chất
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addActivity} className="gap-2 border-primary/30 text-primary">
                  <Plus className="w-4 h-4" /> Thêm
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.activities.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm italic">
                      Chưa có hoạt động nào được ghi nhận hôm nay.
                    </div>
                  ) : (
                    data.activities.map(a => (
                      <Card key={a.id} className="relative border-border/40 bg-card/50 overflow-visible group">
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          onClick={() => removeActivity(a.id)} 
                          className="absolute -top-3 -right-3 h-7 w-7 rounded-full shadow-md z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                          <div className="col-span-2 sm:col-span-1 space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground">Tên hoạt động</Label>
                            <Input placeholder="VD: Bơi lội, Yoga..." value={a.name} onChange={e => updateActivity(a.id, "name", e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase text-muted-foreground">Calo (kcal)</Label>
                              <Input type="number" placeholder="200" value={a.calories} onChange={e => updateActivity(a.id, "calories", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase text-muted-foreground">Thời gian (phút)</Label>
                              <Input type="number" placeholder="45" value={a.duration} onChange={e => updateActivity(a.id, "duration", e.target.value)} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  
                  {data.activities.length > 0 && (
                    <div className="pt-2 text-right">
                       <p className="text-sm font-medium">Tổng hoạt động: <span className="text-primary font-bold">{activityCals} kcal</span></p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Energy Summary */}
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-emerald-700">Tổng Kết Năng Lượng</CardTitle>
                <CardDescription>Cân bằng năng lượng tính toán thực tế trong ngày</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-emerald-900">
                <div className="flex justify-between items-center text-sm">
                  <span>Tổng Calo nạp:</span>
                  <span className="font-bold">+{data.nutrition.calories || "0"} kcal</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Chạy bộ:</span>
                  <span className="font-bold text-orange-600">-{runningCals} kcal</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Hoạt động khác:</span>
                  <span className="font-bold text-orange-600">-{activityCals} kcal</span>
                </div>
                <div className="pt-4 border-t border-emerald-500/20 flex justify-between items-center font-bold text-lg">
                  <span>Cân bằng:</span>
                  <span className={netCalories < 0 ? 'text-blue-600' : 'text-emerald-600'}>
                    {(netCalories >= 0 ? '+' : '') + netCalories} kcal
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}