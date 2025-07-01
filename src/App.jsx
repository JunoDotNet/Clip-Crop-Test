import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import VideoCanvas from './components/VideoCanvas';
import VerticalCanvas from './components/VerticalCanvas';

const App = () => {
  const videoRef = useRef(null);
  const [videoPath, setVideoPath] = useState(null);
  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const [layers, setLayers] = useState([]);
  const [editingCrop, setEditingCrop] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const displayScale = 0.5;

  const handleLoadVideo = async () => {
    const path = await window.electron?.selectVideoFile?.();
    if (path) setVideoPath(path);
  };

  const displayVideoSize = {
    width: videoSize.width * displayScale,
    height: videoSize.height * displayScale,
  };

  const displayFrameSize = {
    width: videoSize.height * displayScale,
    height: videoSize.width * displayScale,
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🎬 Crop App – Phase 2</h2>
      <button onClick={handleLoadVideo}>📂 Import Video</button>
      <div style={{ display: 'flex', gap: 40, marginTop: 20 }}>
        <VideoCanvas
          videoPath={videoPath}
          videoSize={videoSize}
          displaySize={displayVideoSize}
          videoRef={videoRef}
          layers={layers}
          setLayers={setLayers}
          editingCrop={editingCrop}
          setEditingCrop={setEditingCrop}
          editingIndex={editingIndex}
          setEditingIndex={setEditingIndex}
        />
        <VerticalCanvas
          canvasSize={videoSize}
          displaySize={displayFrameSize}
          layers={layers}
          videoRef={videoRef}
          activeCrop={editingCrop}
        />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
