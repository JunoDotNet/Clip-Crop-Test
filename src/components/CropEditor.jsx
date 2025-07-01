import React, { useRef, useState } from 'react';

const EDGE_SIZE = 10; // px, for hit area

const getEdge = (x, y, w, h, mx, my, scale) => {
  const left = mx < EDGE_SIZE / scale;
  const right = mx > w - EDGE_SIZE / scale;
  const top = my < EDGE_SIZE / scale;
  const bottom = my > h - EDGE_SIZE / scale;
  if (left && top) return 'nw';
  if (right && top) return 'ne';
  if (left && bottom) return 'sw';
  if (right && bottom) return 'se';
  if (left) return 'w';
  if (right) return 'e';
  if (top) return 'n';
  if (bottom) return 's';
  return 'move';
};

const cursorForEdge = {
  move: 'move',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
};

const CropEditor = ({ crop, scale = 1, onChange, containerRef, videoSize }) => {
  const boxRef = useRef(null);
  const dragging = useRef(false);
  const dragEdge = useRef('move');
  const startMouse = useRef(null);
  const startCrop = useRef(null);
  const [hoverEdge, setHoverEdge] = useState('move');
  const [active, setActive] = useState(false);

  const getMouse = (e) => {
    const rect = (containerRef?.current || boxRef.current.parentElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const handleMouseMoveBox = (e) => {
    setActive(true);
    const mouse = getMouse(e);
    const edge = getEdge(0, 0, crop.width, crop.height, mouse.x - crop.x, mouse.y - crop.y, scale);
    setHoverEdge(edge);
  };

  const handleMouseLeaveBox = () => {
    setHoverEdge('move');
    setActive(false);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const mouse = getMouse(e);
    const edge = getEdge(0, 0, crop.width, crop.height, mouse.x - crop.x, mouse.y - crop.y, scale);
    dragEdge.current = edge;
    startMouse.current = mouse;
    startCrop.current = { ...crop };
    dragging.current = true;

    const handleMouseMove = (moveEvent) => {
      if (!dragging.current) return;
      const mouse = getMouse(moveEvent);
      let newCrop = { ...startCrop.current };
      const dx = mouse.x - startMouse.current.x;
      const dy = mouse.y - startMouse.current.y;
      if (dragEdge.current === 'move') {
        let newX = startCrop.current.x + dx;
        let newY = startCrop.current.y + dy;
        newX = clamp(newX, 0, videoSize.width - crop.width);
        newY = clamp(newY, 0, videoSize.height - crop.height);
        newCrop.x = newX;
        newCrop.y = newY;
      } else {
        let { x, y, width, height } = startCrop.current;
        if (dragEdge.current.includes('e')) {
          width = clamp(width + dx, 10, videoSize.width - x);
        }
        if (dragEdge.current.includes('s')) {
          height = clamp(height + dy, 10, videoSize.height - y);
        }
        if (dragEdge.current.includes('w')) {
          let nx = clamp(x + dx, 0, x + width - 10);
          width = width - (nx - x);
          x = nx;
        }
        if (dragEdge.current.includes('n')) {
          let ny = clamp(y + dy, 0, y + height - 10);
          height = height - (ny - y);
          y = ny;
        }
        width = clamp(width, 10, videoSize.width - x);
        height = clamp(height, 10, videoSize.height - y);
        newCrop = { x, y, width, height };
      }
      onChange(newCrop);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      dragEdge.current = 'move';
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
      onMouseMove={handleMouseMoveBox}
      onMouseLeave={handleMouseLeaveBox}
      style={{
        position: 'absolute',
        left: crop.x * scale,
        top: crop.y * scale,
        width: crop.width * scale,
        height: crop.height * scale,
        border: '2px dashed lime',
        backgroundColor: 'rgba(0,255,0,0.05)',
        boxSizing: 'border-box',
        cursor: cursorForEdge[hoverEdge],
        zIndex: 2,
        pointerEvents: 'auto',
        transition: 'box-shadow 0.1s',
        boxShadow: dragging.current ? '0 0 8px 2px #0f08' : 'none',
      }}
      tabIndex={-1}
    />
  );
};

export default CropEditor;
