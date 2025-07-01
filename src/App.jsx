import React, { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

let layerIdCounter = 1;

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoPath, setVideoPath] = useState(null);
  const [layers, setLayers] = useState([]);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [currentTool, setCurrentTool] = useState("move"); // "move" | "rotate" | "scale" | "crop"
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const scaleStartRef = useRef({ layerId: null, originDist: 0, initialScale: 1 });
  const rotateStartRef = useRef({ layerId: null, startAngle: 0, initialRotation: 0 });
  const cropDraggingRef = useRef({ layerId: null, offsetX: 0, offsetY: 0 });
  const [isCropLockedToTransform, setIsCropLockedToTransform] = useState(true);


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
    setLayers(prev => [
      ...prev,
      {
        id: layerIdCounter++,
        visible: true,

        // Cropping system (source-space)
        crop: { x: 0, y: 0, width: 1920, height: 1080 },  // default full video
        videoOffset: { x: 0, y: 0 },                     // pan source within crop

        // Transform system (canvas-space)
        transform: {
          x: 0,            // canvas position (translate)
          y: 0,
          scale: 1,
          rotation: 0,     // in radians (or degrees if you prefer)
        },
      },
    ]);
  };

  const drawLayers = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const video = videoRef.current;
    if (!canvas || !ctx || !video || video.readyState < 2) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const layer of layers) {
      if (!layer.visible) continue;

      const { crop, videoOffset, transform } = layer;
      const { x, y, width, height } = crop;
      const { x: offsetX, y: offsetY } = videoOffset;
      const { x: tx, y: ty, scale, rotation } = transform;

      ctx.save();

      const centerX = canvas.width / 2 + tx;
      const centerY = canvas.height / 2 + ty;
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      ctx.drawImage(
        video,
        x + offsetX, y + offsetY, width, height,
        -width / 2, -height / 2,
        width, height
      );
      if (currentTool === "crop") {
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  };  
  
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / displayScale,
      y: (e.clientY - rect.top) / displayScale,
    };
  };

  const handleMouseDown = (e) => {
  const mouse = getMousePos(e);
  const canvasCenter = {
    x: frameSize.width / 2,
    y: frameSize.height / 2,
  };

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible) continue;

    const { transform, crop } = layer;
    const { x, y, scale } = transform;
    const width = crop.width;
    const height = crop.height;

    const cx = canvasCenter.x + x;
    const cy = canvasCenter.y + y;
    const w = width * scale;
    const h = height * scale;

    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const isInside =
      mouse.x >= cx - w / 2 &&
      mouse.x <= cx + w / 2 &&
      mouse.y >= cy - h / 2 &&
      mouse.y <= cy + h / 2;

    if (currentTool === "move" && isInside) {
      setDraggingLayerId(layer.id);
      dragOffsetRef.current = {
        x: mouse.x - transform.x,
        y: mouse.y - transform.y,
      };
      break;
    }

    if (currentTool === "scale" && isInside) {
      scaleStartRef.current = {
        layerId: layer.id,
        originDist: dist,
        initialScale: scale,
      };
      break;
    }

    if (currentTool === "rotate" && isInside) {
      const angle = Math.atan2(dy, dx); // angle from center to mouse
      rotateStartRef.current = {
        layerId: layer.id,
        startAngle: angle,
        initialRotation: transform.rotation,
      };
      break;
    }
    if (currentTool === "crop") {
      const cropX = cx - width / 2;
      const cropY = cy - height / 2;

      const isInCrop =
        mouse.x >= cropX &&
        mouse.x <= cropX + width &&
        mouse.y >= cropY &&
        mouse.y <= cropY + height;

      if (isInCrop) {
        cropDraggingRef.current = {
          layerId: layer.id,
          offsetX: mouse.x - crop.x,
          offsetY: mouse.y - crop.y,
        };
        break;
      }
    }
  }
};

const handleMouseMove = (e) => {
  const mouse = getMousePos(e);

  // 🟦 MOVE
  if (currentTool === "move" && draggingLayerId) {
    const offset = dragOffsetRef.current;
    setLayers(prev =>
      prev.map(layer =>
        layer.id === draggingLayerId
          ? {
              ...layer,
              transform: {
                ...layer.transform,
                x: mouse.x - offset.x,
                y: mouse.y - offset.y,
              },
            }
          : layer
      )
    );
  }

  // 🟨 SCALE
  if (currentTool === "scale" && scaleStartRef.current.layerId !== null) {
    const layer = layers.find(l => l.id === scaleStartRef.current.layerId);
    if (!layer) return;

    const centerX = frameSize.width / 2 + layer.transform.x;
    const centerY = frameSize.height / 2 + layer.transform.y;
    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const scaleRatio = dist / scaleStartRef.current.originDist;
    const newScale = Math.max(0.1, scaleStartRef.current.initialScale * scaleRatio);

    setLayers(prev =>
      prev.map(l =>
        l.id === layer.id
          ? {
              ...l,
              transform: {
                ...l.transform,
                scale: newScale,
              },
            }
          : l
      )
    );
  }
  // 🟥 ROTATE
  if (currentTool === "rotate" && rotateStartRef.current.layerId !== null) {
    const layer = layers.find(l => l.id === rotateStartRef.current.layerId);
    if (!layer) return;

    const centerX = frameSize.width / 2 + layer.transform.x;
    const centerY = frameSize.height / 2 + layer.transform.y;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;
    const currentAngle = Math.atan2(dy, dx);

    const angleDelta = currentAngle - rotateStartRef.current.startAngle;
    const newRotation = rotateStartRef.current.initialRotation + angleDelta;

    setLayers(prev =>
      prev.map(l =>
        l.id === layer.id
          ? {
              ...l,
              transform: {
                ...l.transform,
                rotation: newRotation,
              },
            }
          : l
      )
    );
  }
  // 🟩 CROP DRAG
  if (currentTool === "crop" && cropDraggingRef.current.layerId !== null) {
    const { layerId, offsetX, offsetY } = cropDraggingRef.current;
    const mouse = getMousePos(e);

    setLayers(prev =>
      prev.map(l =>
        l.id === layerId
          ? {
              ...l,
              crop: {
                ...l.crop,
                x: mouse.x - offsetX,
                y: mouse.y - offsetY,
              },
            }
          : l
      )
    );
  }
};


  const handleMouseUp = () => {
    setDraggingLayerId(null);
    scaleStartRef.current = { layerId: null, originDist: 0, initialScale: 1 };
    rotateStartRef.current = { layerId: null, startAngle: 0, initialRotation: 0 };
    cropDraggingRef.current = { layerId: null, offsetX: 0, offsetY: 0 };
  };



  useEffect(() => {
    const video = videoRef.current;
    let rafId = null;
    let cleanup = null;

    const draw = () => drawLayers();

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
      video.addEventListener('timeupdate', draw);
      video.addEventListener('seeked', draw);
      video.addEventListener('play', draw);
      cleanup = () => {
        video.removeEventListener('timeupdate', draw);
        video.removeEventListener('seeked', draw);
        video.removeEventListener('play', draw);
      };
    }

    draw();

    return () => {
      if (cleanup) cleanup();
    };
  }, [layers, videoPath]);

  return (
    <div style={{ padding: 20 }}>
      <h2>🎬 Crop Layout Test - Layers Only</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={handleLoadVideo}>📂 Load Video</button>
      </div>

      <div style={{ display: 'flex', gap: 40, marginTop: 10, alignItems: 'flex-start' }}>
        {/* Left: Original video */}
        <div style={{ position: 'relative' }}>
          <div style={{ ...displayVideoSize, background: '#111', position: 'relative' }}>
            {videoPath ? (
              <video
                ref={videoRef}
                src={`file://${videoPath}`}
                width={displayVideoSize.width}
                height={displayVideoSize.height}
                controls
                style={{ display: 'block' }}
              />
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
                    onClick={() => setLayers(prev => prev.filter(l => l.id !== layer.id))}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Vertical Frame */}
        <div>
          <h4>📱 Vertical Frame (1080×1920)</h4>
          <div style={{ marginBottom: 10 }}>
            <strong>Tool: </strong>
            {["move", "rotate", "scale", "crop"].map(tool => (
              <button
                key={tool}
                onClick={() => setCurrentTool(tool)}
                style={{
                  marginLeft: 6,
                  padding: "4px 8px",
                  backgroundColor: currentTool === tool ? "#cce" : "#eee",
                  border: "1px solid #999",
                  cursor: "pointer"
                }}
              >
                {tool}
              </button>
            ))}
          </div>

          <canvas
            ref={canvasRef}
            width={frameSize.width}
            height={frameSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
