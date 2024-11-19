
// components/ARScene.js
export default function ARScene({ imageURL, onBack }) {
    return (
      <div className="relative h-screen">
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow"
        >
          ← Back
        </button>
        <a-scene
          embedded
          arjs="sourceType: webcam; debugUIEnabled: false;"
          vr-mode-ui="enabled: false"
        >
          <a-assets>
            <img id="target" src={imageURL} />
          </a-assets>
  
          <a-marker type="pattern" url={imageURL}>
            <a-box
              position="0 1 0"
              rotation="0 45 0"
              color="#4CC3D9"
              animation="property: rotation; to: 0 360 0; loop: true; dur: 10000"
            />
          </a-marker>
  
          <a-entity camera></a-entity>
        </a-scene>
      </div>
    );
  }