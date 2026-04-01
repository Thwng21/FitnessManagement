"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, RefreshCcw, Timer, Zap, Image as ImageIcon, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export interface CapturedPhoto {
  src: string;
  caption: string;
  time: string;
}

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (images: CapturedPhoto[]) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedImages, setCapturedImages] = useState<CapturedPhoto[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [userWeight, setUserWeight] = useState<string | null>(null);

  // Touch Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && selectedPreview !== null && selectedPreview < capturedImages.length - 1) {
      setSelectedPreview(selectedPreview + 1);
    } else if (isRightSwipe && selectedPreview !== null && selectedPreview > 0) {
      setSelectedPreview(selectedPreview - 1);
    }
  };

  const deletePhoto = (index: number) => {
    const newImages = capturedImages.filter((_, i) => i !== index);
    setCapturedImages(newImages);
    
    if (newImages.length === 0) {
      setSelectedPreview(null);
    } else {
      // Giữ nguyên index nếu chưa phải ảnh cuối, nếu là ảnh cuối thì lùi lại 1
      const nextIndex = index >= newImages.length ? newImages.length - 1 : index;
      setSelectedPreview(nextIndex);
    }
  };

  const updateCaption = (index: number, text: string) => {
    setCapturedImages(prev => prev.map((img, i) => i === index ? { ...img, caption: text } : img));
  };
  
  // Timer & Burst State
  const [timerMode, setTimerMode] = useState<0 | 3 | 10>(0); // 0 = off, 3s, 10s
  const [burstAmount, setBurstAmount] = useState<0 | 3 | 5 | 10>(0); // 0 = off, 3, 5, 10 photos
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  // Khởi động Camera
  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          // aspectRatio: 1 - Không nên fix tỉ lệ qua API vì nhiều thiết bị sẽ bị lỗi, ta cắt qua CSS
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Lỗi truy cập máy ảnh:", err);
      toast.error("Trình duyệt từ chối cấp quyền truy cập máy ảnh. Vui lòng kiểm tra quyền trong cài đặt trình duyệt hoặc sử dụng HTTPS.");
      onClose();
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
      
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      api.get(`/health/${todayKey}`).then(res => {
        if (res.data && res.data.weight) {
          setUserWeight(res.data.weight.toString());
        }
      }).catch(err => console.error(err));
      
    } else {
      setUserWeight(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setCapturedImages([]); 
      setCountdown(null);
      setSelectedPreview(null);
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]); // eslint-disable-line

  const toggleCamera = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Khôi phục hệ tọa độ
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (userWeight) {
          ctx.font = "bold 80px sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
          ctx.lineWidth = 6;
          ctx.textAlign = "left";
          
          const text = `${userWeight} kg`;
          const x = 40;
          const y = canvas.height - 40;
          
          ctx.strokeText(text, x, y);
          ctx.fillText(text, x, y);
        }
        
        setFlash(true);
        setTimeout(() => setFlash(false), 200);

        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const imageSrc = canvas.toDataURL("image/jpeg", 0.92);
        setCapturedImages(prev => [...prev, { src: imageSrc, caption: "", time: timeStr }]);
      }
    }
  };

  const takePhoto = async () => {
    if (isCapturing) return;

    const startCaptureSequence = async () => {
      setIsCapturing(true);

      if (burstAmount > 1) {
        for (let i = 0; i < burstAmount; i++) {
          captureFrame();
          if (i < burstAmount - 1) {
             await new Promise(resolve => setTimeout(resolve, 800)); // Hơi nhanh hơn một chút cho burst mode
          }
        }
      } else {
        captureFrame();
      }
      setIsCapturing(false);
    };

    if (timerMode > 0) {
      let timeLeft = timerMode;
      setCountdown(timeLeft);
      
      const interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          clearInterval(interval);
          setCountdown(null);
          startCaptureSequence();
        } else {
          setCountdown(timeLeft);
        }
      }, 1000);
    } else {
      startCaptureSequence();
    }
  };

  const handleDone = () => {
    onCapture(capturedImages);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 bg-black text-white flex flex-col justify-between overflow-hidden">
      {flash && <div className="absolute inset-0 bg-white z-99 animate-in fade-out duration-200" />}
      
      {countdown !== null && (
         <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <span className="text-[150px] font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] animate-pulse">
               {countdown}
            </span>
         </div>
      )}

      <div className="flex justify-between items-center p-6 z-10 w-full bg-linear-to-b from-black/80 to-transparent pb-16">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-neutral-800 text-white">
          <X className="w-6 h-6" />
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTimerMode(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)} 
            className={`relative rounded-full transition-colors ${timerMode > 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-neutral-800 text-white hover:bg-neutral-700"}`}
          >
            <Timer className="w-5 h-5" />
            {timerMode > 0 && <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-white text-black rounded-full w-4 h-4 flex items-center justify-center leading-none">{timerMode}s</span>}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setBurstAmount(prev => prev === 0 ? 3 : prev === 3 ? 5 : prev === 5 ? 10 : 0)} 
            className={`relative rounded-full transition-colors ${burstAmount > 0 ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-neutral-800 text-white hover:bg-neutral-700"}`}
            title="Chụp liên tiếp nhiều tấm"
          >
            <Zap className="w-5 h-5" />
            {burstAmount > 0 && <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-white text-amber-600 rounded-full w-4 h-4 flex items-center justify-center leading-none">x{burstAmount}</span>}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-[500px] mx-auto z-0 relative min-h-0">
        <div className="relative w-full max-w-[360px] aspect-3/4 rounded-3xl overflow-hidden bg-neutral-900 border-4 border-neutral-800 shadow-[2px_10px_40px_rgba(0,0,0,0.5)]">
          <video 
            ref={videoRef} 
            onClick={takePhoto}
            autoPlay 
            playsInline={true}
            webkit-playsinline="true"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            muted={true}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full object-cover transition-transform duration-300 ${facingMode === "user" ? "scale-x-[-1]" : ""}`} 
          />
          {userWeight && (
            <div className="absolute bottom-4 left-4 z-10 text-white/60 font-bold text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none">
              {userWeight} kg
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="px-6 w-full max-w-[500px] mx-auto z-10 h-[70px] shrink-0 flex gap-2 overflow-x-auto items-center justify-center relative -mt-4">
        {capturedImages.map((img, i) => (
           <div 
             key={i} 
             onClick={() => setSelectedPreview(i)}
             className="relative w-12 h-16 rounded-xl overflow-hidden border-2 border-white/20 shrink-0 shadow-lg cursor-pointer hover:border-primary hover:scale-105 transition-all"
           >
             <img src={img.src} className="w-full h-full object-cover pointer-events-none" />
             <div className="absolute inset-0 bg-black/10 pointer-events-none" />
             {img.caption && <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-[6px] text-white text-center rounded-sm truncate px-0.5">{img.caption}</div>}
           </div>
        ))}
      </div>

      <div className="px-8 pb-8 pt-4 w-full flex justify-between items-center z-10 max-w-[500px] mx-auto relative shrink-0">
        <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center border border-white/10 opacity-70">
          <ImageIcon className="w-5 h-5 text-white/50" />
        </div>

        <button 
          onClick={takePhoto} 
          disabled={isCapturing}
          className="relative w-24 h-24 rounded-full bg-white flex items-center justify-center group transform transition-all active:scale-95 disabled:opacity-50 border-4 border-neutral-400 focus:outline-none"
        >
          <div className="w-[80px] h-[80px] rounded-full border-4 border-black group-hover:bg-neutral-100 transition-colors" />
        </button>

        <button onClick={toggleCamera} className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-neutral-700 transition-colors focus:outline-none border border-white/10">
          <RefreshCcw className="w-5 h-5 text-white" />
        </button>
      </div>

      {capturedImages.length > 0 && !isCapturing && (
         <div className="absolute bottom-[110px] left-0 right-0 flex justify-center z-20 animate-in slide-in-from-bottom-5">
            <Button onClick={handleDone} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 font-bold text-lg shadow-[0_4px_25px_rgba(16,185,129,0.5)] border border-primary/20">
               Lưu {capturedImages.length} bức ảnh
            </Button>
         </div>
      )}

      {/* Hiển thị chi tiết từng ảnh (Preview Overlay) */}
      {selectedPreview !== null && (
        <div className="absolute inset-0 z-110 bg-black flex flex-col md:p-4">
          <div className="flex justify-between items-center p-6 bg-linear-to-b from-black/80 to-transparent absolute top-0 left-0 w-full z-10">
            <Button variant="outline" onClick={() => setSelectedPreview(null)} className="rounded-full border-white/20 bg-black/50 hover:bg-white hover:text-black text-white px-5 transition-all">
              <Check className="w-5 h-5 mr-1" />
              Xong
            </Button>
            <div className="font-semibold text-white/70 tracking-widest px-4 py-1.5 bg-neutral-900/50 rounded-full backdrop-blur-md">
               {selectedPreview + 1} / {capturedImages.length}
            </div>
            <Button variant="ghost" size="icon" onClick={() => deletePhoto(selectedPreview)} className="rounded-full hover:bg-red-900/50 text-red-500">
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
          
          <div 
             className="flex-1 flex flex-col items-center justify-center w-full h-full relative p-4 mt-16 md:mt-20 overflow-hidden"
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
          >
             <div className="relative flex flex-col items-center justify-center w-full h-full animate-in fade-in zoom-in-95 duration-200" key={selectedPreview}>
               <img src={capturedImages[selectedPreview].src} alt="Preview" className="max-w-full max-h-full rounded-3xl object-contain border border-white/10 shadow-2xl pointer-events-none" />
               
               {/* Nút vuốt trái phải (dành cho Desktop/chuột hoặc người dùng không quen vuốt) */}
               {selectedPreview > 0 && (
                 <Button variant="ghost" size="icon" onClick={() => setSelectedPreview(selectedPreview - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/80 hidden sm:flex">
                    <span className="text-xl">❮</span>
                 </Button>
               )}
               {selectedPreview < capturedImages.length - 1 && (
                 <Button variant="ghost" size="icon" onClick={() => setSelectedPreview(selectedPreview + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/80 hidden sm:flex">
                    <span className="text-xl">❯</span>
                 </Button>
               )}

               <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
                 <input 
                   type="text"
                   autoFocus
                   placeholder="Thêm chú thích..."
                   value={capturedImages[selectedPreview].caption}
                   onChange={(e) => updateCaption(selectedPreview, e.target.value)}
                   className="w-full max-w-[90%] bg-black/60 backdrop-blur-md border border-white/20 text-white placeholder-white/60 text-center text-lg md:text-xl font-medium px-6 py-3 rounded-full outline-none focus:bg-black/80 shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-all pointer-events-auto"
                   onFocus={(e) => {
                      // Vô hiệu hóa vuốt khi đang sửa chữ để tránh nhập nhằng
                      setTouchStart(null);
                      setTouchEnd(null);
                   }}
                 />
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
