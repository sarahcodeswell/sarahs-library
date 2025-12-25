import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Loader2 } from 'lucide-react';

export default function PhotoCaptureModal({ isOpen, onClose, onPhotoCaptured }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please use file upload instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const imageUrl = URL.createObjectURL(blob);
      
      setCapturedImage({ file, url: imageUrl });
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCapturedImage({ file, url: imageUrl });
    setError('');
  };

  const handleProcess = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', capturedImage.file);

      const response = await fetch('/api/recognize-books', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const result = await response.json();
      
      if (result.books && result.books.length > 0) {
        onPhotoCaptured(result.books);
        handleClose();
      } else {
        setError('No books detected in the image. Please try again with a clearer photo.');
      }
    } catch (err) {
      console.error('Image processing error:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError('');
    setIsProcessing(false);
    onClose();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E8EBE4]">
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-6 pt-6 pb-3 border-b border-[#E8EBE4] flex items-center justify-between">
          <h2 className="text-xl font-serif text-[#4A5940]">Add Books from Photo</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#96A888]" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!capturedImage && !showCamera && (
            <div className="space-y-4">
              <p className="text-sm text-[#7A8F6C] mb-4">
                Take a photo of your book spines or covers, and we'll automatically recognize them.
              </p>

              <button
                onClick={startCamera}
                className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Camera className="w-5 h-5" />
                Open Camera
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E8EBE4]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#96A888]">Or</span>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border-2 border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors flex items-center justify-center gap-2 font-medium text-[#5F7252]"
              >
                <Upload className="w-5 h-5" />
                Upload from Gallery
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {showCamera && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-2.5 px-4 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors text-[#5F7252] font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 px-4 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium"
                >
                  Capture Photo
                </button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-[#E8EBE4]">
                <img
                  src={capturedImage.url}
                  alt="Captured"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-4 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors text-[#5F7252] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retake
                </button>
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 px-4 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Recognize Books'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
