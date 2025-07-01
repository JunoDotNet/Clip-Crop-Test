import React, { useRef } from 'react';
import CropEditor from './CropEditor';
import CropBox from './CropBox';

const VideoCanvas = ({
  videoPath,
  videoSize,
  displaySize,
  videoRef,
  layers,
  setLayers,
}) => {
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawStart, setDrawStart] = React.useState(null);
  const [tempBox, setTempBox] = React.useState(null);

  const scale = displaySize.width / videoSize.width;

  // Drawing a new crop box
  const getMouse = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e) => {
    if (!isDrawing) return;
    const pos = getMouse(e);
    setDrawStart(pos);
    setTempBox(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !drawStart) return;
    const current = getMouse(e);
    const box = {
      x: Math.min(drawStart.x, current.x),
      y: Math.min(drawStart.y, current.y),
      width: Math.abs(drawStart.x - current.x),
      height: Math.abs(drawStart.y - current.y),
    };
    setTempBox(box);
  };

  const handleMouseUp = () => {
    if (tempBox && tempBox.width > 10 && tempBox.height > 10) {
      setLayers((prev) => [
        ...prev,
        {
          id: Date.now(),
          crop: tempBox,
        },
      ]);
      setIsDrawing(false);
    }
    setDrawStart(null);
    setTempBox(null);
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <h4>📺 Source Video</h4>
      <button
        onClick={() => {
          setIsDrawing(true);
        }}
        style={{ marginBottom: 8 }}
      >
        ➕ New Crop
      </button>
      <div
        ref={containerRef}
        style={{
          width: displaySize.width,
          height: displaySize.height,
          position: 'relative',
          background: '#111',
        }}
        onMouseDown={isDrawing ? handleMouseDown : undefined}
        onMouseMove={isDrawing ? handleMouseMove : undefined}
        onMouseUp={isDrawing ? handleMouseUp : undefined}
      >
        {videoPath && (
          <video
            ref={videoRef}
            src={`file://${videoPath}`}
            width={displaySize.width}
            height={displaySize.height}
            controls
            style={{ display: 'block', pointerEvents: 'none' }}
          />
        )}

        {/* Draw temp box while dragging */}
        {tempBox && <CropBox box={tempBox} scale={scale} />}

        {/* Show all committed crop boxes as draggable CropEditors */}
        {layers.map((layer, i) => (
          <CropEditor
            key={layer.id}
            crop={layer.crop}
            scale={scale}
            onChange={(newCrop) => {
              setLayers((prev) =>
                prev.map((l, j) => (j === i ? { ...l, crop: newCrop } : l))
              );
            }}
            containerRef={containerRef}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoCanvas;