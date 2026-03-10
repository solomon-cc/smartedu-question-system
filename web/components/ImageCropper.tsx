import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Loader2, Maximize, Square, RectangleHorizontal } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspect?: number;
  language: string;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onCancel, aspect: initialAspect, language }) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(initialAspect || 16/9); // Default to 16:9 for options
  const [isProcessing, setIsProcessing] = useState(false);
  const [imgSrc, setImgSrc] = useState(image);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If it's a remote URL, append a timestamp to bypass cache potential CORS issues
    if (image.startsWith('http')) {
      const separator = image.includes('?') ? '&' : '?';
      setImgSrc(`${image}${separator}cors_bust=${Date.now()}`);
    } else {
      setImgSrc(image);
    }
  }, [image]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // Initial centered crop with aspect
    if (aspect) {
      setCrop(centerAspectCrop(width, height, aspect));
    } else {
      setCrop({
        unit: '%',
        width: 80,
        height: 80,
        x: 10,
        y: 10
      });
    }
  }

  useEffect(() => {
    if (imgRef.current && aspect) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }, [aspect]);

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop,
  ): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Set canvas size to the ACTUAL natural pixels of the crop area
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    // High quality scaling
    ctx.imageSmoothingQuality = 'high';

    // Fill with white background first to avoid black areas in JPEG for transparent images
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleApplyCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedImage);
    } catch (e: any) {
      console.error(e);
      if (e.name === 'SecurityError') {
        alert(language === 'zh' ? '图片跨域权限错误：请确保素材库域名已开启 CORS 许可' : 'CORS Security Error: Please ensure the asset domain has CORS enabled.');
      } else {
        alert(language === 'zh' ? '裁切处理失败' : 'Crop failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col animate-in fade-in duration-300 overflow-hidden">
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 overflow-auto">
        <div className="max-w-full">
           <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              className="max-h-full"
           >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                crossOrigin="anonymous"
                onLoad={onImageLoad}
                className="block max-w-full max-h-[70vh]"
              />
           </ReactCrop>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-900 p-6 shadow-2xl border-t dark:border-gray-800 shrink-0">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex justify-center gap-4">
             <button 
               onClick={() => setAspect(16/9)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${aspect === 16/9 ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
             >
               <RectangleHorizontal className="w-4 h-4" />
               16:9
             </button>
             <button 
               onClick={() => setAspect(4/3)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${aspect === 4/3 ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
             >
               <Maximize className="w-4 h-4" />
               4:3
             </button>
             <button 
               onClick={() => setAspect(1)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${aspect === 1 ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
             >
               <Square className="w-4 h-4" />
               1:1
             </button>
             <button 
               onClick={() => setAspect(undefined)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${aspect === undefined ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
             >
               <Maximize className="w-4 h-4" />
               {language === 'zh' ? '自由' : 'Free'}
             </button>
          </div>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            {language === 'zh' ? '拖动边框调整范围，点击确定保存' : 'Drag edges to resize, click apply to save'}
          </p>

          <div className="flex gap-4">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleApplyCrop}
              disabled={isProcessing || !completedCrop}
              className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 flex items-center justify-center gap-2 hover:bg-primary-700 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {language === 'zh' ? '正在处理...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {language === 'zh' ? '确定裁切' : 'Apply Crop'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
