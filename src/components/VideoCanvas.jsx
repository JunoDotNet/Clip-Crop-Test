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
            style={{ display: 'block', pointerEvents: 'auto', zIndex: 0 }}
          />
        )}

        {/* Overlay to allow pointer events to reach video controls only */}
        {videoPath && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              height: 48, // typical video controls height
              bottom: 0,
              pointerEvents: 'auto',
              zIndex: 1,
              background: 'transparent',
            }}
          />
        )}

        {/* Draw temp box while dragging */}
        {tempBox && <CropBox box={tempBox} scale={scale} />}

        {/* Show all committed crop boxes as draggable CropEditors (do not filter hidden) */}
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
            videoSize={videoSize}
          />
        ))}
      </div>
      {/* Layer panel below the video canvas */}
      <div
        style={{
          width: displaySize.width,
          background: '#222',
          color: '#eee',
          fontSize: 14,
          marginTop: 12,
          borderRadius: 4,
          padding: 8,
          boxSizing: 'border-box',
        }}
      >
        <strong>Crop Layers</strong>
        <div style={{ marginTop: 6 }}>
          {layers.length === 0 && (
            <div style={{ color: '#888' }}>No crops yet.</div>
          )}
          {layers.map((layer, i) => (
            <div
              key={layer.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '2px 0',
                borderBottom: '1px solid #333',
                opacity: layer.hidden ? 0.5 : 1,
              }}
            >
              <span style={{ color: '#0f0', minWidth: 24 }}>#{i + 1}</span>
              <span style={{ fontFamily: 'monospace' }}>
                x:{Math.round(layer.crop.x)}, y:{Math.round(layer.crop.y)}, w:
                {Math.round(layer.crop.width)}, h:
                {Math.round(layer.crop.height)}
              </span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                title="Move Up"
                disabled={i === 0}
                onClick={() => {
                  if (i === 0) return;
                  setLayers(prev => {
                    const arr = [...prev];
                    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                    return arr;
                  });
                }}
              >
                ↑
              </button>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                title="Move Down"
                disabled={i === layers.length - 1}
                onClick={() => {
                  if (i === layers.length - 1) return;
                  setLayers(prev => {
                    const arr = [...prev];
                    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                    return arr;
                  });
                }}
              >
                ↓
              </button>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                title={layer.hidden ? 'Show' : 'Hide'}
                onClick={() => {
                  setLayers(prev => prev.map((l, j) => j === i ? { ...l, hidden: !l.hidden } : l));
                }}
              >
                {layer.hidden ? '🙈' : '👁'}
              </button>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#f44' }}
                title="Delete"
                onClick={() => {
                  setLayers(prev => prev.filter((_, j) => j !== i));
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoCanvas;