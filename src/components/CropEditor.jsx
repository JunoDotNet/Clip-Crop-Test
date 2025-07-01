import React, { useRef } from 'react';

const CropEditor = ({ crop, scale = 1, onChange, containerRef }) => {
  const boxRef = useRef(null);
  const dragging = useRef(false);
  const startMouse = useRef(null);
  const startCrop = useRef(null);

  const getMouse = (e) => {
    const rect = (containerRef?.current || boxRef.current.parentElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    startMouse.current = getMouse(e);
    startCrop.current = { ...crop };
    dragging.current = true;

    const handleMouseMove = (moveEvent) => {
      if (!dragging.current) return;
      const mouse = getMouse(moveEvent);
      const dx = mouse.x - startMouse.current.x;
      const dy = mouse.y - startMouse.current.y;
      onChange({
        ...crop,
        x: startCrop.current.x + dx,
        y: startCrop.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      dragging.current = false;
      startMouse.current = null;
      startCrop.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: crop.x * scale,
        top: crop.y * scale,
        width: crop.width * scale,
        height: crop.height * scale,
        border: '2px dashed lime',
        backgroundColor: 'rgba(0,255,0,0.05)',
        boxSizing: 'border-box',
        cursor: 'move',
        zIndex: 2,
        pointerEvents: 'auto',
      }}
      tabIndex={-1}
    />
  );
};

export default CropEditor;
