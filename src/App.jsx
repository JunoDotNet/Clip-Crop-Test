import React, { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

let layerIdCounter = 1;

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoPath, setVideoPath] = useState(null);
  const [layers, setLayers] = useState([]);

  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropEnd, setCropEnd] = useState(null);

  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [scalingLayerId, setScalingLayerId] = useState(null);

  const displayScale = 0.5;
  const videoSize = { width: 1920, height: 1080 };
  const frameSize = { width: 1080, height: 1920 };

  const displayVideoSize = {
    width: videoSize.width * displayScale,
    height: videoSize.height * displayScale,
  };

  const displayFrameSize = {
    width: frameSize.width * displayScale,
    height: frameSize.height * displayScale,
  };

  const handleLoadVideo = async () => {
    if (window.electron?.selectVideoFile) {
      const path = await window.electron.selectVideoFile();
      if (path) setVideoPath(path);
    }
  };

  const handleCreateLayer = () => {
    if (!videoPath) return;
    setIsCropping(true);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleScaleChange = (layerId, value) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, videoScale: value } : layer
      )
    );
  };

  const drawLayers = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    if (!canvas || !ctx || !video || video.readyState < 2) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const layer of layers) {
      if (!layer.visible) continue;

      const { crop, videoOffset, offset, repositioning, videoScale = 1 } = layer;

      if (repositioning) {
        ctx.save();
        ctx.globalAlpha = 0.3;

        // Draw the entire video aligned so crop remains in same position
        const drawX = offset.x - (crop.x - videoOffset.x);
        const drawY = offset.y - (crop.y - videoOffset.y);
        ctx.drawImage(video, drawX, drawY);

        ctx.restore();

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(offset.x, offset.y, crop.width, crop.height);
      } else {
        // Draw cropped video, then scale inside crop
        ctx.save();
        ctx.beginPath();
        ctx.rect(offset.x, offset.y, crop.width, crop.height);
        ctx.clip();
        ctx.translate(offset.x + crop.width / 2, offset.y + crop.height / 2);
        ctx.scale(videoScale, videoScale);
        ctx.drawImage(
          video,
          crop.x - videoOffset.x,
          crop.y - videoOffset.y,
          crop.width,
          crop.height,
          -crop.width / 2,
          -crop.height / 2,
          crop.width,
          crop.height
        );
        ctx.restore();
      }
    }
  };

  // Remove the animation loop and use effect to redraw only when needed
  useEffect(() => {
    const video = videoRef.current;
    let rafId = null;
    let cleanup = null;

    // Helper to draw when video frame changes
    const draw = () => {
      drawLayers();
    };

    // If video supports requestVideoFrameCallback, use it for smooth updates
    if (video && 'requestVideoFrameCallback' in video) {
      let running = true;
      const onFrame = () => {
        if (!running) return;
        draw();
        rafId = video.requestVideoFrameCallback(onFrame);
      };
      rafId = video.requestVideoFrameCallback(onFrame);
      cleanup = () => {
        running = false;
        if (rafId && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(rafId);
      };
    } else if (video) {
      // Fallback: draw on timeupdate, seeked, play
      video.addEventListener('timeupdate', draw);
      video.addEventListener('seeked', draw);
      video.addEventListener('play', draw);
      cleanup = () => {
        video.removeEventListener('timeupdate', draw);
        video.removeEventListener('seeked', draw);
        video.removeEventListener('play', draw);
      };
    }

    // Also draw when layers change
    draw();

    return () => {
      if (cleanup) cleanup();
    };
  }, [layers, videoPath]);

  const getMousePos = (e, scale = displayScale) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleCanvasMouseDown = e => {
    const mouse = getMousePos(e);

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const { offset, crop, repositioning, translating, videoOffset } = layer;

      if (repositioning) {
        setDraggingLayerId(layer.id);
        dragOffsetRef.current = {
          x: mouse.x - videoOffset.x,
          y: mouse.y - videoOffset.y,
        };
        break;
      } else if (translating) {
        const boxX = offset.x;
        const boxY = offset.y;
        const boxW = crop.width;
        const boxH = crop.height;

        if (
          mouse.x >= boxX &&
          mouse.x <= boxX + boxW &&
          mouse.y >= boxY &&
          mouse.y <= boxY + boxH
        ) {
          setDraggingLayerId(layer.id);
          dragOffsetRef.current = {
            x: mouse.x,
            y: mouse.y,
          };
          break;
        }
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingLayerId(null);
  };

  const handleCanvasMouseMove = e => {
    if (!draggingLayerId) return;

    const mouse = getMousePos(e);
    const dragOffset = dragOffsetRef.current;
    const dx = mouse.x - dragOffset.x;
    const dy = mouse.y - dragOffset.y;

    setLayers(prev =>
      prev.map(layer => {
        if (layer.id !== draggingLayerId) return layer;

        const updated = { ...layer };

        if (layer.repositioning) {
          updated.videoOffset = {
            x: layer.videoOffset.x + dx,
            y: layer.videoOffset.y + dy,
          };
        } else if (layer.translating) {
          // Move both crop and videoOffset together
          updated.offset = {
            x: layer.offset.x + dx,
            y: layer.offset.y + dy,
          };
          updated.crop = {
            ...layer.crop,
            x: layer.crop.x + dx,
            y: layer.crop.y + dy,
          };
          updated.videoOffset = {
            x: layer.videoOffset.x + dx,
            y: layer.videoOffset.y + dy,
          };
        }

        return updated;
      })
    );

    dragOffsetRef.current = mouse;
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🎬 Crop Layout Test - Layers + Reposition</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={handleLoadVideo}>📂 Load Video</button>
      </div>

      <div style={{ display: 'flex', gap: 40, marginTop: 10, alignItems: 'flex-start' }}>
        {/* Left: Original video */}
        <div style={{ position: 'relative' }}>
          <div style={{ ...displayVideoSize, background: '#111', position: 'relative' }}>
            {videoPath ? (
              <>
                <video
                  ref={videoRef}
                  src={`file://${videoPath}`}
                  width={displayVideoSize.width}
                  height={displayVideoSize.height}
                  controls
                  style={{ display: 'block' }}
                />
                {isCropping && (
                  <div
                    onMouseDown={e => setCropStart(getMousePos(e))}
                    onMouseMove={e => cropStart && setCropEnd(getMousePos(e))}
                    onMouseUp={() => {
                      if (!cropStart || !cropEnd) return;
                      const x = Math.min(cropStart.x, cropEnd.x);
                      const y = Math.min(cropStart.y, cropEnd.y);
                      const width = Math.abs(cropEnd.x - cropStart.x);
                      const height = Math.abs(cropEnd.y - cropStart.y);

                      setLayers(prev => [
                        ...prev,
                        {
                          id: layerIdCounter++,
                          crop: { x, y, width, height },
                          offset: { x: 0, y: 0 },
                          videoOffset: { x: 0, y: 0 },
                          visible: true,
                          repositioning: false,
                          translating: false,
                        },
                      ]);

                      setIsCropping(false);
                      setCropStart(null);
                      setCropEnd(null);
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: displayVideoSize.width,
                      height: displayVideoSize.height,
                      cursor: 'crosshair',
                    }}
                  >
                    {cropStart && cropEnd && (
                      <div
                        style={{
                          position: 'absolute',
                          border: '2px dashed red',
                          background: 'rgba(255,0,0,0.1)',
                          left: Math.min(cropStart.x, cropEnd.x) * displayScale,
                          top: Math.min(cropStart.y, cropEnd.y) * displayScale,
                          width: Math.abs(cropEnd.x - cropStart.x) * displayScale,
                          height: Math.abs(cropEnd.y - cropStart.y) * displayScale,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#ccc', padding: 20 }}>No video loaded</p>
            )}
          </div>
          {videoPath && (
            <button onClick={handleCreateLayer} style={{ marginTop: 10, width: '100%' }}>
              ➕ Create Layer
            </button>
          )}
          {layers.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <h4>🧱 Layers</h4>
              {layers.map(layer => (
                <div key={layer.id} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                  <span>Layer {layer.id}</span>
                  <button
                    onClick={() =>
                      setLayers(prev =>
                        prev.map(l =>
                          l.id === layer.id ? { ...l, visible: !l.visible } : l
                        )
                      )
                    }
                  >
                    {layer.visible ? '👁️ Hide' : '🙈 Show'}
                  </button>
                  <button
                    onClick={() =>
                      setLayers(prev =>
                        prev.map(l =>
                          l.id === layer.id
                            ? { ...l, repositioning: !l.repositioning, translating: false }
                            : l
                        )
                      )
                    }
                  >
                    ⚙️
                  </button>
                  <button
                    onClick={() => setScalingLayerId(scalingLayerId === layer.id ? null : layer.id)}
                    style={scalingLayerId === layer.id ? { border: '2px solid #00eaff', borderRadius: 4 } : {}}
                  >
                    🔲
                  </button>
                  <button
                    onClick={() =>
                      setLayers(prev =>
                        prev.map(l =>
                          l.id === layer.id
                            ? { ...l, translating: !l.translating, repositioning: false }
                            : l
                        )
                      )
                    }
                  >
                    🏹
                  </button>
                  <button
                    onClick={() => setLayers(prev => prev.filter(l => l.id !== layer.id))}
                  >
                    🗑️ Delete
                  </button>
                  {scalingLayerId === layer.id && (
                    <input
                      type="range"
                      min={0.2}
                      max={3}
                      step={0.01}
                      value={layer.videoScale || 1}
                      onChange={e => handleScaleChange(layer.id, parseFloat(e.target.value))}
                      style={{ marginLeft: 8, width: 80 }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Vertical Frame */}
        <div>
          <h4>📱 Vertical Frame (1080×1920)</h4>
          <canvas
            ref={canvasRef}
            width={frameSize.width}
            height={frameSize.height}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              width: displayFrameSize.width,
              height: displayFrameSize.height,
              border: '2px solid #888',
              background: '#000',
              cursor: draggingLayerId ? 'grabbing' : 'grab',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);