import { useEffect, useRef } from 'react';

interface ARExperienceProps {
  targetImage: string;
  overlayImage: string;
  onBack: () => void;
}

export default function ARExperience({ targetImage, overlayImage, onBack }: ARExperienceProps) {
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      // Wait for A-Frame to load
      const checkAFrame = setInterval(() => {
        if (window.AFRAME) {
          clearInterval(checkAFrame);
          console.log('A-Frame loaded');
        }
      }, 100);

      return () => clearInterval(checkAFrame);
    }
  }, []);
  console.log("Target Image : ", targetImage)
  return (
    <div className="relative h-screen">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 bg-white p-2 rounded shadow"
      >
        ← Back
      </button>
      
      <a-scene 
        ref={sceneRef} 
        embedded 
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
      >
        <a-assets>
          <img id="targetImage" src={targetImage} crossOrigin="anonymous" />
          <img id="overlayImage" src={overlayImage} crossOrigin="anonymous" />
        </a-assets>
        
        <a-entity
          simple-ar="
            src: target.png; 
            minCutOffValue: 1; 
            betaValue: 0.1;
            smoothCount: 10;
          "
        >
          <a-plane
          position="0 0 0"
          rotation="0 0 0"
          width="1"
          height="1"
          material="src: https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg"
        ></a-plane>
        </a-entity>

        <a-camera position="0 0 0"></a-camera>
      </a-scene>
    </div>
  );
}