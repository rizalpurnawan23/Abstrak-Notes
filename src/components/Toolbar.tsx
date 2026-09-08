import React, { useState } from 'react';

export type PaperSize = 'infinite' | 'a4' | 'a5' | 'letter';
export type GridType = 'none' | 'ruled' | 'dots' | 'graph';
export type ToolType = 'pen' | 'eraser' | 'lasso' | 'pan';

interface ToolbarProps {
  activeTool: ToolType;
  setTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  penSize: number;
  setPenSize: (size: number) => void;
  zoom: number;
  setZoom: (zoom: React.SetStateAction<number>) => void;
  paperSize: PaperSize;
  setPaperSize: (size: PaperSize) => void;
  gridType: GridType;
  setGridType: (grid: GridType) => void;
  onClear: () => void;
  isDarkMode?: boolean;
}

export const SIZES = [1, 2, 4, 6, 10];
const QUICK_COLORS = ['#000000', '#007acc', '#e53935', '#4caf50', '#8e24aa'];

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
  gridType,
  setGridType,
  onClear,
  isDarkMode = false,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

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
        gap: '10px',
        padding: '10px',
        borderRadius: '16px',
        background: isDarkMode ? '#2c2c2e' : '#ffffff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        zIndex: 100,
        maxHeight: '85vh',
        overflowY: 'auto',
      }}
    >
      {/* Minimize / Expand Toggle */}
      <button
        onClick={() => setIsMinimized((prev) => !prev)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          color: isDarkMode ? '#aaa' : '#666',
          padding: '2px',
        }}
        title={isMinimized ? 'Expand Toolbar' : 'Minimize Toolbar'}
      >
        {isMinimized ? '◀' : '▶'}
      </button>

      {/* Main Tool Selectors */}
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

        <button
          onClick={() => setTool('lasso')}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTool === 'lasso' ? '#007acc' : 'transparent',
            color: activeTool === 'lasso' ? '#fff' : 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title="Lasso Select"
        >
          ⭕
        </button>

        <button
          onClick={() => setTool('pan')}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTool === 'pan' ? '#007acc' : 'transparent',
            color: activeTool === 'pan' ? '#fff' : 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title="Pan / Canvas Hover"
        >
          🖐️
        </button>
      </div>

      {!isMinimized && (
        <>
          <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

          {/* Quick Color Palette Swatches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            {QUICK_COLORS.map((swatch) => (
              <button
                key={swatch}
                onClick={() => setColor(swatch)}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: color === swatch ? '2px solid #007acc' : '1px solid #ccc',
                  background: swatch,
                  cursor: 'pointer',
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '26px', height: '26px', border: 'none', background: 'none', cursor: 'pointer' }}
              title="Custom Color"
            />
          </div>

          <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

          {/* Pen Size Presets */}
          {activeTool === 'pen' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {SIZES.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setPenSize(sz)}
                  style={{
                    width: '24px',
                    height: '24px',
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
                      width: `${Math.min(sz * 1.5 + 2, 14)}px`,
                      height: `${Math.min(sz * 1.5 + 2, 14)}px`,
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

          {/* Page Layout Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: isDarkMode ? '#aaa' : '#777' }}>Page</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
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

            <span style={{ fontSize: '10px', color: isDarkMode ? '#aaa' : '#777', marginTop: '4px' }}>Grid</span>
            <select
              value={gridType}
              onChange={(e) => setGridType(e.target.value as GridType)}
              style={{
                fontSize: '11px',
                padding: '2px 4px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                background: isDarkMode ? '#333' : '#fff',
                color: 'inherit',
              }}
            >
              <option value="none">Blank</option>
              <option value="ruled">Ruled</option>
              <option value="dots">Dots</option>
              <option value="graph">Graph</option>
            </select>
          </div>

          <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

          {/* Zoom Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setZoom((z) => Math.min(4.0, Math.round((z + 0.1) * 10) / 10))}
              style={{ width: '24px', height: '22px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
            >
              +
            </button>
            <span style={{ fontSize: '10px' }}>{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.1, Math.round((z - 0.1) * 10) / 10))}
              style={{ width: '24px', height: '22px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
            >
              -
            </button>
          </div>

          <div style={{ width: '80%', height: '1px', background: isDarkMode ? '#444' : '#e0e0e0' }} />

          <button
            onClick={onClear}
            style={{
              padding: '4px 6px',
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
        </>
      )}
    </div>
  );
};