import React, { useState, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

export default function PhotoCaptureModal({ isOpen, onClose, onPhotoCaptured }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);


  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 10MB. Please choose a smaller image.');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WebP).');
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
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(capturedImage.file);
      });

      const base64Image = await base64Promise;
      const mediaType = capturedImage.file.type || 'image/jpeg';

      const response = await fetch('/api/recognize-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          mediaType: mediaType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process image');
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
      setError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
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

          {!capturedImage && (
            <div className="space-y-4">
              <p className="text-sm text-[#7A8F6C] mb-4">
                Upload a photo of your book spines or covers, and we'll automatically recognize them.
              </p>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940] transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Upload className="w-5 h-5" />
                Upload Photo
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
