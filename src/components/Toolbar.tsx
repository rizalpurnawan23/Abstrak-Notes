import React from 'react';

export type PaperSize = 'infinite' | 'a4' | 'a5' | 'letter';

interface ToolbarProps {
  activeTool: 'pen' | 'eraser';
  setTool: (tool: 'pen' | 'eraser') => void;
  color: string;
  setColor: (color: string) => void;
  penSize: number;
  setPenSize: (size: number) => void;
  zoom: number;
  setZoom: (zoom: React.SetStateAction<number>) => void;
  paperSize: PaperSize;
  setPaperSize: (size: PaperSize) => void;
  onClear: () => void;
  isDarkMode?: boolean;
}

export const SIZES = [1, 2, 4, 6, 10];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setTool,
  color,
  setColor,
  penSize,
  setPenSize,
  zoom,
  setZoom,
  paperSize,
  setPaperSize,
  onClear,
  isDarkMode = false,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 10px',
        borderRadius: '16px',
        background: isDarkMode ? '#2c2c2e' : '#ffffff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        zIndex: 100,
      }}
    >
      {/* Tool Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => setTool('pen')}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTool === 'pen' ? '#007acc' : 'transparent',
            color: activeTool === 'pen' ? '#fff' : 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title="Pen"
        >
          ✏️
        </button>

        <button
          onClick={() => setTool('eraser')}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTool === 'eraser' ? '#007acc' : 'transparent',
            color: activeTool === 'eraser' ? '#fff' : 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title="Eraser"
        >
          🧹
        </button>
      </div>

      <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

      {/* Discrete Pen Sizes */}
      {activeTool === 'pen' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          {SIZES.map((sz) => (
            <button
              key={sz}
              onClick={() => setPenSize(sz)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: penSize === sz ? '2px solid #007acc' : '1px solid #ccc',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: `${Math.min(sz * 1.5 + 2, 16)}px`,
                  height: `${Math.min(sz * 1.5 + 2, 16)}px`,
                  borderRadius: '50%',
                  background: color,
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Color Picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer' }}
      />

      <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

      {/* Paper Size Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: isDarkMode ? '#aaa' : '#777' }}>Page</span>
        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as PaperSize)}
          style={{
            fontSize: '11px',
            padding: '4px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            background: isDarkMode ? '#333' : '#fff',
            color: 'inherit',
          }}
        >
          <option value="infinite">Infinite</option>
          <option value="a4">A4</option>
          <option value="a5">A5</option>
          <option value="letter">Letter</option>
        </select>
      </div>

      <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

      {/* Zoom Scale Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => setZoom((z) => Math.min(4.0, Math.round((z + 0.1) * 10) / 10))}
          style={{ width: '26px', height: '24px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          +
        </button>
        <span style={{ fontSize: '11px' }}>{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.1, Math.round((z - 0.1) * 10) / 10))}
          style={{ width: '26px', height: '24px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          -
        </button>
      </div>

      <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

      <button
        onClick={onClear}
        style={{
          padding: '6px',
          borderRadius: '6px',
          border: '1px solid #ff4d4f',
          color: '#ff4d4f',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '12px',
        }}
        title="Clear Canvas"
      >
        🗑️
      </button>
    </div>
  );
};