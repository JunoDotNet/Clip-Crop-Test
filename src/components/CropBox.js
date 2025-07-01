import React from 'react';

const CropBox = ({ box, scale }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x * scale,
        top: box.y * scale,
        width: box.width * scale,
        height: box.height * scale,
        border: '2px dashed lime',
        background: 'rgba(0, 255, 0, 0.1)',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
};

export default CropBox;
