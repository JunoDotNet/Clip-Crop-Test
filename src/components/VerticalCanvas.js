import React, { useEffect, useRef } from 'react';

const VerticalCanvas = ({ canvasSize, displaySize, layers, videoRef, activeCrop }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const video = videoRef.current;
    if (!ctx || !video || video.readyState < 2) return;

    ctx.clearRect(0, 0, canvasSize.height, canvasSize.width);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize.height, canvasSize.width);

    const toDraw = activeCrop ? [...layers, { id: 'live', crop: activeCrop }] : layers;

    for (const layer of toDraw) {
      const { crop } = layer;
      ctx.drawImage(
        video,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        (canvasSize.height - crop.width) / 2,
        (canvasSize.width - crop.height) / 2,
        crop.width,
        crop.height
      );
    }
  }, [canvasSize, layers, videoRef, activeCrop]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h4>📱 Vertical Canvas</h4>
      <canvas
        ref={canvasRef}
        width={canvasSize.height}
        height={canvasSize.width}
        style={{
          width: displaySize.width,
          height: displaySize.height,
          background: '#111',
          border: '1px solid #555',
        }}
      />
    </div>
  );
};


export default VerticalCanvas;
