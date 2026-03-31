"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
  startOfDay,
  isBefore,
  isAfter
} from "date-fns";
import { vi } from "date-fns/locale";
import { Plus, Camera, Trash2, Image as ImageIcon, X, Download, CheckSquare, Square, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import CameraModal from "@/components/CameraModal";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseISO } from "date-fns";

interface PhotoData {
  id: string;
  url: string;
  date: string;
  time: string;
  note?: string;
  weight?: number;
}

export default function PhotosPage() {
  const TODAY = new Date();

  const [displayMonths, setDisplayMonths] = useState(() =>
    Array.from({ length: 3 }).map((_, i) => subMonths(TODAY, i))
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoData | null>(null);
  
  // States cho Multi-select và Photobooth
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  const [allPhotos, setAllPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await api.get("/photos");
      setAllPhotos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setSheetOpen(true);
  };

  const deletePhoto = (photo: PhotoData) => {
    setPhotoToDelete(photo);
    setIsDeletingMultiple(false);
    setIsDeleteDialogOpen(true);
  };

  const deleteMultiplePhotos = () => {
    if (selectedPhotoIds.length === 0) return;
    setIsDeletingMultiple(true);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (isDeletingMultiple) {
      if (selectedPhotoIds.length === 0) return;
      try {
        await Promise.all(selectedPhotoIds.map((id) => api.delete(`/photos/${id}`)));
        setAllPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(p.id)));
        toast.success(`Đã xóa thành công ${selectedPhotoIds.length} ảnh.`);
        setIsDeleteDialogOpen(false);
        setIsDeletingMultiple(false);
        setSelectedPhotoIds([]);
        setIsSelectionMode(false);
      } catch (err) {
        console.error("Failed to delete photos:", err);
        toast.error("Lỗi khi xóa nhiều ảnh.");
      }
      return;
    }

    if (!photoToDelete) return;

    try {
      await api.delete(`/photos/${photoToDelete.id}`);
      // Cập nhật state ngay lập tức để UI biến đổi
      setAllPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
      toast.success("Đã xóa ảnh thành công.");
      setIsDeleteDialogOpen(false);
      setPhotoToDelete(null);
    } catch (err) {
      console.error("Failed to delete photo:", err);
      toast.error("Lỗi khi xóa ảnh.");
    }
  };

  const handleToggleSelectPhoto = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPhotoIds((prev) => [...prev, id]);
    } else {
      setSelectedPhotoIds((prev) => prev.filter((p) => p !== id));
    }
  };

  const generatePhotobooth = async (photosToUse: PhotoData[], dateToUse: Date) => {
    if (!photosToUse || photosToUse.length === 0) {
      toast.error("Không có ảnh nào để tạo Photobooth.");
      return;
    }
    const loadingToast = toast.loading("Đang tạo Photobooth, vui lòng đợi...");
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context is not supported");

      const stripWidth = 800;
      const padding = 50;
      const imageMargin = 40;
      const headerSpace = 250;
      const footerSpace = 150;

      const titleDate = format(dateToUse, "dd/MM/yyyy");

      // Load images
      const loadedImages = await Promise.all(
        photosToUse.map(
          (p) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error("Lỗi tải hình"));
              img.src = p.url;
            })
        )
      );

      // Calculatiion
      const maxDrawWidth = stripWidth - padding * 2;
      const drawHeights = loadedImages.map((img) => (img.height / img.width) * maxDrawWidth);
      const totalImagesHeight =
        drawHeights.reduce((a, b) => a + b, 0) + (drawHeights.length > 1 ? imageMargin * (drawHeights.length - 1) : 0);

      canvas.width = stripWidth;
      canvas.height = headerSpace + totalImagesHeight + padding + footerSpace;

      // Draw Bg
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 80px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GwouthFit Daily", canvas.width / 2, 120);

      ctx.fillStyle = "#888888";
      ctx.font = "italic 36px sans-serif";
      ctx.fillText(titleDate, canvas.width / 2, 180);

      // Draw Images
      let currentY = headerSpace;
      loadedImages.forEach((img, idx) => {
        const height = drawHeights[idx];
        
        ctx.fillStyle = "#222";
        ctx.fillRect(padding, currentY, maxDrawWidth, height);
        
        ctx.drawImage(img, padding, currentY, maxDrawWidth, height);
        currentY += height + imageMargin;
      });

      // Footer
      ctx.fillStyle = "#555555";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tạo bởi ứng dụng GwouthFit", canvas.width / 2, canvas.height - 60);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `photobooth-${titleDate.replace(/\//g, "-")}.jpg`;
      a.click();
      toast.dismiss(loadingToast);
      toast.success("Đã tạo và tải Photobooth về máy!");
    } catch (err) {
      console.error("Error creating photobooth", err);
      toast.dismiss(loadingToast);
      toast.error("Lỗi tạo Photobooth.");
    }
  };

  const handleCapture = async (images: any[]) => {
    const dateStr = format(selectedDate || TODAY, "yyyy-MM-dd");
    let successCount = 0;
    
    for (const img of images) {
      try {
        const response = await api.post("/photos", {
          image: img.src,
          date: dateStr,
          time: img.time,
          note: img.caption || null,
        });
        setAllPhotos(prev => [response.data, ...prev]);
        successCount++;
      } catch (err) {
        console.error("Failed to upload photo:", err);
      }
    }

    if (successCount > 0) {
      toast.success(`Đã tải lên thành công ${successCount} ảnh!`);
      setIsCameraOpen(false);
    }
  };

  const getPhotosForDay = (day: Date): PhotoData[] => {
    const formatted = format(day, "yyyy-MM-dd");
    return (allPhotos || []).filter(p => p.date === formatted);
  };

  const handleOpenCamera = () => {
    if (selectedDate) {
      if (isBefore(startOfDay(selectedDate), startOfDay(TODAY))) {
        toast.error("Không thể chụp ảnh cho ngày trong quá khứ.");
        return;
      }
      if (isAfter(startOfDay(selectedDate), startOfDay(TODAY))) {
        toast.error("Không thể chụp ảnh cho ngày tương lai.");
        return;
      }
    }
    setIsCameraOpen(true);
  };

  const handLoadMore = () => {
    const lastMonth = displayMonths[displayMonths.length - 1];
    const newMonths = Array.from({ length: 3 }).map((_, i) => subMonths(lastMonth, i + 1));
    setDisplayMonths([...displayMonths, ...newMonths]);
  };

  const selectedData = selectedDate ? getPhotosForDay(selectedDate) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Tiêu đề & Cụm Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Camera className="w-8 h-8 text-primary" />
              Nhật Ký Cơ Thể
            </h1>
            <p className="text-muted-foreground mt-1">Theo dõi thay đổi của bạn qua từng bức ảnh</p>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            <Button 
                onClick={() => {
                   const todayData = getPhotosForDay(TODAY);
                   generatePhotobooth(todayData, TODAY);
                }} 
                variant="secondary"
                className="gap-2 rounded-full font-bold shadow-md hover:scale-105 transition-transform"
            >
              <Download className="w-5 h-5" /> Photobooth Hôm Nay
            </Button>
            <Button 
                onClick={() => {
                    setSelectedDate(TODAY);
                    setIsCameraOpen(true);
                }} 
                className="gap-2 bg-primary px-6 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" /> Thêm Ảnh Hôm Nay
            </Button>
          </div>
        </div>

        {/* Lịch tháng */}
        <div className="space-y-12">
          {displayMonths.map((currentMonth, idxMonth) => {
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(monthStart);
            const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
            const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
            const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

            return (
              <div key={idxMonth} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <h2 className="text-2xl font-bold capitalize">
                    Tháng {format(currentMonth, "M, yyyy", { locale: vi })}
                  </h2>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <Card className="border-border shadow-sm bg-card rounded-[2rem] overflow-hidden">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    {/* Header thứ */}
                    <div className="grid grid-cols-7 mb-4">
                      {weekDays.map((day) => (
                        <div key={day} className="text-center font-bold text-xs sm:text-sm text-muted-foreground uppercase tracking-wider py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Lưới ngày */}
                    <div className="grid grid-cols-7 gap-2 sm:gap-4 lg:gap-6">
                      {calendarDays.map((day, idx) => {
                        const photos = getPhotosForDay(day);
                        const isCurrentMonthDay = isSameMonth(day, monthStart);
                        const isTodayFlag = isSameDay(day, TODAY);
                        const hasPhoto = photos.length > 0;
                        const coverPhoto = hasPhoto ? photos[0].url : null;

                        return (
                          <div
                            key={idx}
                            onClick={() => handleDayClick(day)}
                            className={`
                              group relative aspect-square rounded-[1rem] sm:rounded-[1.5rem] overflow-hidden cursor-pointer
                              transition-all duration-300 ease-out transform
                              ${!isCurrentMonthDay ? "opacity-30 grayscale" : ""}
                              ${hasPhoto ? "hover:scale-105 hover:shadow-xl hover:z-10" : "hover:bg-secondary/50"}
                              ${!hasPhoto && isCurrentMonthDay ? "bg-secondary/20 border-2 border-dashed border-border/50" : ""}
                              ${isTodayFlag && !hasPhoto ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-solid border-primary/50 bg-primary/5" : ""}
                            `}
                          >
                            {hasPhoto && (
                              <>
                                <img
                                  src={coverPhoto as string}
                                  alt="Ngày tập"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80" />
                              </>
                            )}

                            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                              <span className={`text-sm sm:text-lg lg:text-xl font-black leading-none ${hasPhoto ? "text-white" : "text-foreground/50"}`}>
                                {format(day, "d")}
                              </span>
                            </div>

                            {photos.length > 1 && (
                              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/50 backdrop-blur-md rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white border border-white/20">
                                +{photos.length - 1}
                              </div>
                            )}

                            {!hasPhoto && isTodayFlag && (
                              <div className="absolute inset-0 flex items-center justify-center text-primary opacity-50">
                                <Plus className="w-6 h-6 sm:w-8 sm:h-8" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          <div className="flex justify-center pt-4 pb-12">
            <Button onClick={handLoadMore} variant="outline" className="rounded-full px-8 py-6 font-bold shadow-sm">
              Tải thêm các tháng trước
            </Button>
          </div>
        </div>
      </main>

      {/* Full-screen Overlay Chi Tiết Ảnh Ngày */}
      {sheetOpen && selectedDate && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom-8 duration-300">
          {/* Header sticky */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 bg-background/90 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSheetOpen(false)}
                className="rounded-full hover:bg-secondary shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {format(selectedDate, "EEEE", { locale: vi })}
                </span>
                <h2 className="text-xl sm:text-2xl font-black leading-tight">
                  {format(selectedDate, "dd 'tháng' MM, yyyy", { locale: vi })}
                </h2>
              </div>
            </div>
            {selectedData.length > 0 && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  title="Tạo ảnh ghép tổng hợp (Photobooth)"
                  className="rounded-full font-semibold border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => generatePhotobooth(selectedData, selectedDate)}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Photobooth</span>
                </Button>
                {isSelectionMode ? (
                  <>
                    <Button 
                       variant="ghost" 
                       size="sm"
                       className="rounded-full"
                       onClick={() => {
                         setIsSelectionMode(false);
                         setSelectedPhotoIds([]);
                       }}
                    >
                      Hủy
                    </Button>
                    <Button 
                       variant="destructive" 
                       size="sm"
                       className="rounded-full font-bold gap-2"
                       onClick={deleteMultiplePhotos}
                       disabled={selectedPhotoIds.length === 0}
                    >
                      Xóa {selectedPhotoIds.length > 0 ? `(${selectedPhotoIds.length})` : ""}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsSelectionMode(true)}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" /> Chọn xóa
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Nội dung cuộn */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
              {selectedData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {selectedData.map((photo) => {
                    const isSelected = selectedPhotoIds.includes(photo.id); return (
                    <div key={photo.id} className={`relative group flex flex-col space-y-3 transition-transform ${isSelectionMode ? "cursor-pointer" : ""} ${isSelectionMode && isSelected ? "scale-[0.97] opacity-90" : ""}`} onClick={() => isSelectionMode && handleToggleSelectPhoto(photo.id, !isSelected)}>
                      {isSelectionMode && (
                        <div className="absolute z-20 top-4 right-4 rounded-full bg-black/40 backdrop-blur-md p-1 shadow-lg pointer-events-none">
                          {isSelected ? <CheckSquare className="w-8 h-8 text-white bg-green-500 rounded text-center border-0 p-1" /> : <Square className="w-8 h-8 text-white p-1" />}
                        </div>
                      )}
                      <div className="relative w-full rounded-[2rem] overflow-hidden shadow-xl bg-secondary/20">
                        <img
                          src={photo.url}
                          alt={"Ảnh ngày " + format(selectedDate, "dd/MM/yyyy")}
                          className="w-full h-auto object-contain"
                        />
                        {/* Gradient overlay với giờ và nút xóa — cho tất cả ảnh */}
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent p-5 pt-16 pointer-events-none">
                          <div className="flex justify-between items-end">
                            <div>
                              <h4 className="text-white/60 font-bold text-xl drop-shadow-md tracking-widest">{photo.time}</h4>
                              {photo.weight && (
                                <p className="text-white font-black text-3xl drop-shadow-md mt-0.5">
                                  {photo.weight} <span className="text-base font-semibold text-white/70">kg</span>
                                </p>
                              )}
                            </div>
                            {!isSelectionMode && (
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); deletePhoto(photo); }}
                              className="rounded-full shadow-lg h-10 w-10 opacity-80 hover:opacity-100 transition-opacity pointer-events-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {photo.note && (
                        <div className="bg-secondary/40 p-4 rounded-2xl border border-secondary/60">
                          <p className="text-sm font-medium text-foreground/90">"{photo.note}"</p>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                  <div className="w-24 h-24 bg-secondary rounded-[2rem] flex items-center justify-center p-6 rotate-3 drop-shadow-xl">
                    <ImageIcon className="w-full h-full text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Chưa có ảnh nào</h3>
                    <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                      Hãy lưu lại khoảnh khắc cơ thể của bạn vào ngày này để xem lại sự thay đổi nhé.
                    </p>
                  </div>
                  <Button 
                    onClick={handleOpenCamera}
                    className="font-bold py-6 px-8 rounded-full shadow-lg gap-2"
                  >
                    <Camera className="w-5 h-5" /> Mở Máy Ảnh
                  </Button>
                </div>
              )}

              {selectedData.length > 0 && (
                <div className="flex justify-center pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleOpenCamera}
                    className="font-bold rounded-full py-6 px-8 border-2 border-dashed gap-2 w-full max-w-md text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    <Plus className="w-5 h-5" /> Thêm một ảnh khác
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapture}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-red-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" /> Xác nhận xóa ảnh?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isDeletingMultiple 
                ? `Bạn có chắc chắn muốn xóa ${selectedPhotoIds.length} ảnh đã chọn không? Hành động này không thể hoàn tác.`
                : `Ảnh chụp lúc ${photoToDelete?.time} ngày ${photoToDelete ? format(parseISO(photoToDelete.date), "dd/MM") : ""} sẽ bị xóa vĩnh viễn khỏi nhật ký của bạn.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-8"
            >
              Xác nhận Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
