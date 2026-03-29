"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { 
  Plus, Trash2, Edit2, Video, Link as LinkIcon, Save, X, PlusCircle, 
  Dumbbell, ChevronDown, ChevronUp, Loader2, PlayCircle, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface ExerciseTemplate {
  id?: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  description?: string;
  videoUrl?: string;
}

interface WorkoutTemplate {
  id: string;
  title: string;
  exercises: ExerciseTemplate[];
}

// ─── HELPER ───────────────────────────────────────────────────────────────────
const Linkify = ({ text }: { text?: string }) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => (
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline flex-inline items-center gap-1">
            {part} <LinkIcon className="inline w-3 h-3" />
          </a>
        ) : part
      ))}
    </span>
  );
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function WorkoutLibraryPage() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<WorkoutTemplate> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Exercise Modal State
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [targetTemplateId, setTargetTemplateId] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Partial<ExerciseTemplate>>({
    name: "", sets: 3, reps: 12, weight: 0, description: ""
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/workouts/templates");
      setTemplates(response.data || []);
    } catch (err) {
      toast.error("Không thể tải danh sách bài tập");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async () => {
    if (!editingTemplate?.title) return toast.error("Vui lòng nhập tên buổi tập");
    
    try {
      await api.post("/workouts", {
        id: editingTemplate.id,
        title: editingTemplate.title,
        exercises: editingTemplate.exercises || []
      });
      toast.success(editingTemplate.id ? "Đã cập nhật" : "Đã tạo buổi tập mới");
      setIsSectionModalOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error("Lỗi khi lưu dữ liệu");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/workouts/${id}`);
      toast.success("Đã xóa buổi tập");
      fetchTemplates();
    } catch (err) {
      toast.error("Lỗi khi xóa");
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // Increase to 50MB
      return toast.error("Video quá lớn (Tối đa 50MB)");
    }

    setUploadingVideo(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      const res = await api.post("/photos/upload-video", { video: base64 });
      setCurrentExercise(prev => ({ ...prev, videoUrl: res.data.url }));
      toast.success("Đã tải video lên thành công");
    } catch (err) {
      console.error("Video upload error:", err);
      toast.error("Lỗi khi tải video lên hệ thống");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveExercise = async () => {
    if (!currentExercise.name || !targetTemplateId) return toast.error("Vui lòng nhập tên bài tập");
    if (isSaving) return;

    setIsSaving(true);
    try {
      const template = templates.find(t => t.id === targetTemplateId);
      if (!template) throw new Error("Template not found");

      // Tránh trùng lặp bằng cách lọc bỏ bài tập có cùng tên nếu đang "edit" (ở đây chỉ là add mới nhưng ta làm an toàn)
      const otherExercises = template.exercises.filter(ex => ex.name !== currentExercise.name);
      
      const updatedExercises = [...otherExercises, currentExercise].map(ex => ({
         ...ex,
         sets: Number(ex.sets),
         reps: Number(ex.reps),
         weight: Number(ex.weight)
      }));

      await api.post("/workouts", {
        id: template.id,
        title: template.title,
        exercises: updatedExercises
      });
      
      toast.success("Đã lưu bài tập");
      setIsExerciseModalOpen(false);
      await fetchTemplates(); // Đợi tải xong dữ liệu mới
    } catch (err) {
      toast.error("Lỗi khi lưu bài tập");
    } finally {
      setIsSaving(false);
    }
  };

  const removeExercise = async (templateId: string, exerciseName: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const updatedExercises = template.exercises.filter(ex => ex.name !== exerciseName);
    try {
      await api.post("/workouts", {
        id: template.id,
        title: template.title,
        exercises: updatedExercises
      });
      toast.success("Đã xóa bài tập");
      fetchTemplates();
    } catch (err) {
       toast.error("Lỗi khi xóa bài tập");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl">
        
        {/* ─── HEADER ─── */}
        <div className="flex justify-between items-center bg-secondary/30 p-6 rounded-[2rem] border border-border/40 backdrop-blur-sm">
           <div>
              <h1 className="text-3xl font-black tracking-tight">Thư viện Bài tập</h1>
              <p className="text-muted-foreground">Xây dựng và quản lý các giáo án tập luyện của bạn</p>
           </div>
           <Button 
             onClick={() => { setEditingTemplate({ title: "", exercises: [] }); setIsSectionModalOpen(true); }}
             className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
           >
             <Plus className="w-5 h-5 mr-2" /> Tạo Buổi tập
           </Button>
        </div>

        {/* ─── TEMPLATE LIST ─── */}
        <div className="space-y-4">
           {templates.length === 0 ? (
             <Card className="border-dashed border-2 py-20 bg-secondary/10 flex flex-col items-center justify-center text-center rounded-[2rem]">
                <Dumbbell className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">Chưa có giáo án nào</h3>
                <p className="text-muted-foreground mt-2">Hãy bắt đầu bằng cách tạo một buổi tập mới!</p>
             </Card>
           ) : (
             templates.map((template) => (
               <Card key={template.id} className="overflow-hidden border-border/60 rounded-[2rem] hover:border-primary/40 transition-colors shadow-sm">
                 <div 
                   className="p-6 flex items-center justify-between cursor-pointer hover:bg-secondary/20 transition-colors"
                   onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                 >
                    <div className="flex items-center gap-4">
                       <div className="bg-primary/10 p-3 rounded-2xl">
                          <PlusCircle className="w-6 h-6 text-primary" />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold">{template.title}</h3>
                          <p className="text-sm text-muted-foreground">{template.exercises.length} bài tập đã thêm</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button 
                         variant="ghost" size="icon" className="rounded-full"
                         onClick={(e) => { e.stopPropagation(); setEditingTemplate(template); setIsSectionModalOpen(true); }}
                       >
                         <Edit2 className="w-4 h-4" />
                       </Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="w-4 h-4" />
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                                <AlertDialogDescription>Mọi bài tập trong buổi "{template.title}" sẽ bị mất vĩnh viễn.</AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)} className="bg-destructive hover:bg-destructive/90">Xóa bài</AlertDialogAction>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                       {expandedId === template.id ? <ChevronUp className="w-5 h-5 ml-2" /> : <ChevronDown className="w-5 h-5 ml-2" />}
                    </div>
                 </div>

                 {expandedId === template.id && (
                   <div className="p-6 border-t border-border/40 bg-secondary/5 space-y-6 animate-in slide-in-from-top-2 duration-300">
                      
                      {/* Sub-exercises */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {template.exercises.map((ex, idx) => (
                           <div key={idx} className="bg-background border border-border/60 p-4 rounded-3xl relative group">
                              <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <h4 className="font-bold text-lg">{ex.name}</h4>
                                    <div className="flex gap-2 mt-1">
                                       <Badge variant="secondary" className="bg-primary/5 text-primary border-none">{ex.sets} Sets</Badge>
                                       <Badge variant="secondary" className="bg-orange-500/5 text-orange-600 border-none">{ex.reps} Reps</Badge>
                                    </div>
                                 </div>
                                 <Button 
                                   variant="ghost" size="icon" 
                                   className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-destructive"
                                   onClick={() => removeExercise(template.id, ex.name)}
                                 >
                                    <X className="w-4 h-4" />
                                 </Button>
                              </div>

                              <div className="mt-4 text-sm text-muted-foreground">
                                 <Linkify text={ex.description} />
                              </div>

                              {ex.videoUrl && (
                                <div className="mt-4 rounded-2xl overflow-hidden aspect-video bg-black relative group/vid">
                                   <video src={ex.videoUrl} className="w-full h-full object-cover opacity-80" />
                                   <div 
                                     className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                                     onClick={() => window.open(ex.videoUrl, '_blank')}
                                   >
                                      <PlayCircle className="w-12 h-12 text-white" />
                                   </div>
                                </div>
                              )}
                           </div>
                         ))}

                         <button 
                           onClick={() => { setTargetTemplateId(template.id); setIsExerciseModalOpen(true); setCurrentExercise({ name: "", sets: 3, reps: 12, weight: 0, description: "" }); }}
                           className="border-2 border-dashed border-border/60 p-8 rounded-3xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all group"
                         >
                            <PlusCircle className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold uppercase text-xs tracking-widest">Thêm bài tập chi tiết</span>
                         </button>
                      </div>
                   </div>
                 )}
               </Card>
             ))
           )}
        </div>

        {/* ─── MODAL: CREATE/EDIT SECTION ─── */}
        <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
           <DialogContent className="rounded-[2rem] sm:max-w-[425px]">
              <DialogHeader>
                 <DialogTitle>{editingTemplate?.id ? "Sửa buổi tập" : "Tạo buổi tập mới"}</DialogTitle>
                 <DialogDescription>Nhập tiêu đề cho buổi tập mẫu của bạn (ví dụ: Tập ngực, Fullbody...)</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                 <div className="space-y-2">
                    <label className="text-sm font-bold px-1">Tên buổi tập</label>
                    <Input 
                      placeholder="Nhập tiêu đề..." 
                      value={editingTemplate?.title || ""} 
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev!, title: e.target.value }))}
                      className="rounded-xl h-12"
                    />
                 </div>
              </div>
              <DialogFooter>
                 <Button variant="ghost" onClick={() => setIsSectionModalOpen(false)}>Hủy</Button>
                 <Button onClick={handleSaveSection} className="rounded-xl px-8 font-bold">Lưu lại</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* ─── MODAL: ADD EXERCISE ─── */}
        <Dialog open={isExerciseModalOpen} onOpenChange={setIsExerciseModalOpen}>
           <DialogContent className="rounded-[2.5rem] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                 <DialogTitle className="text-2xl font-black">Thêm Bài Tập</DialogTitle>
                 <DialogDescription>Điền thông tin chi tiết bài tập để lưu vào giáo án.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                       <Dumbbell className="w-4 h-4 text-primary" /> Tên bài tập
                    </label>
                    <Input 
                      placeholder="Ví dụ: Đẩy ngực ngang, Squat..." 
                      value={currentExercise.name}
                      onChange={(e) => setCurrentExercise(prev => ({ ...prev, name: e.target.value }))}
                      className="rounded-2xl h-12"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-bold px-1">Số hiệp (Sets)</label>
                       <Input 
                         type="number" value={currentExercise.sets}
                         onChange={(e) => setCurrentExercise(prev => ({ ...prev, sets: Number(e.target.value) }))}
                         className="rounded-2xl h-12"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold px-1">Số cái (Reps)</label>
                       <Input 
                         type="number" value={currentExercise.reps}
                         onChange={(e) => setCurrentExercise(prev => ({ ...prev, reps: Number(e.target.value) }))}
                         className="rounded-2xl h-12"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                       <Info className="w-4 h-4 text-blue-500" /> Mô tả & Link
                    </label>
                    <Textarea 
                      placeholder="Hướng dẫn kỹ thuật, dán link YouTube..." 
                      value={currentExercise.description}
                      onChange={(e) => setCurrentExercise(prev => ({ ...prev, description: e.target.value }))}
                      className="rounded-2xl min-h-[100px] resize-none"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                       <Video className="w-4 h-4 text-red-500" /> Video minh họa
                    </label>
                    <div className="relative border-2 border-dashed border-border/60 rounded-2xl p-6 flex flex-col items-center justify-center bg-secondary/5 hover:bg-secondary/10 transition-colors">
                       {uploadingVideo ? (
                          <div className="flex flex-col items-center gap-2">
                             <Loader2 className="w-8 h-8 animate-spin text-primary" />
                             <p className="text-xs font-bold animate-pulse">Đang tải video lên...</p>
                          </div>
                       ) : currentExercise.videoUrl ? (
                          <div className="w-full space-y-2">
                             <video src={currentExercise.videoUrl} className="w-full rounded-xl aspect-video object-cover" controls />
                             <Button 
                               variant="destructive" size="sm" className="w-full rounded-xl"
                               onClick={() => setCurrentExercise(prev => ({ ...prev, videoUrl: undefined }))}
                             >
                                <Trash2 className="w-4 h-4 mr-2" /> Xóa video
                             </Button>
                          </div>
                       ) : (
                          <>
                             <Video className="w-10 h-10 text-muted-foreground/30 mb-2" />
                             <p className="text-xs text-muted-foreground mb-4 text-center">Tải lên video bài tập (MP4, tối đa 50MB)</p>
                             <input 
                               type="file" 
                               accept="video/*" 
                               ref={videoInputRef}
                               onChange={handleVideoUpload}
                               className="hidden"
                             />
                             <Button 
                               type="button"
                               size="sm" 
                               variant="secondary" 
                               className="rounded-xl font-bold"
                               onClick={() => videoInputRef.current?.click()}
                             >
                                Chọn File
                             </Button>
                          </>
                       )}
                    </div>
                 </div>
              </div>
              <DialogFooter className="gap-2">
                 <Button variant="ghost" className="rounded-xl" onClick={() => setIsExerciseModalOpen(false)} disabled={isSaving || uploadingVideo}>Hủy</Button>
                 <Button onClick={handleSaveExercise} className="rounded-xl px-12 font-bold shadow-lg shadow-primary/20" disabled={isSaving || uploadingVideo}>
                    {isSaving ? (
                       <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
                    ) : "Lưu Bài Tập"}
                 </Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>

      </main>
    </>
  );
}