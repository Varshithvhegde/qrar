'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const ARExperience = dynamic(() => import('@/components/ui/ARExperience'), {
  ssr: false,
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading AR components...</div>
});

export default function Home() {
  const [targetImage, setTargetImage] = useState('');
  const [overlayImage, setOverlayImage] = useState('');
  const [showAR, setShowAR] = useState(false);

  const handleTargetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setTargetImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOverlayImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setOverlayImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen p-4">
      {!showAR ? (
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-center">Simple AR Experience</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">
                Upload Target Image (What to track)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleTargetImageUpload}
                className="w-full p-2 border rounded"
              />
              {targetImage && (
                <img 
                  src={targetImage} 
                  alt="Target" 
                  className="mt-2 w-full max-h-40 object-contain"
                />
              )}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Upload Overlay Image (What to display)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleOverlayImageUpload}
                className="w-full p-2 border rounded"
              />
              {overlayImage && (
                <img 
                  src={overlayImage} 
                  alt="Overlay" 
                  className="mt-2 w-full max-h-40 object-contain"
                />
              )}
            </div>

            {targetImage && overlayImage && (
              <button
                onClick={() => setShowAR(true)}
                className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Start AR Experience
              </button>
            )}
          </div>
        </div>
      ) : (
        <ARExperience
          targetImage={targetImage}
          overlayImage={overlayImage}
          onBack={() => setShowAR(false)}
        />
      )}
    </div>
  );
}