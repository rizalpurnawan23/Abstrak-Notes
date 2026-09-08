import React from 'react';
import jsPDF from 'jspdf';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  noteTitle?: string;
  isDarkMode?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  noteTitle = 'Untitled Note',
  isDarkMode = false,
}) => {
  if (!isOpen) return null;

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageURI = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${noteTitle.replace(/\s+/g, '_')}.png`;
    link.href = imageURI;
    link.click();
    onClose();
  };

  const handleExportPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageURI = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imageURI, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${noteTitle.replace(/\s+/g, '_')}.pdf`);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: isDarkMode ? '#252525' : '#ffffff',
          color: isDarkMode ? '#ffffff' : '#000000',
          padding: '24px',
          borderRadius: '12px',
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h3 style={{ margin: 0 }}>Export Note</h3>
        
        <button
          onClick={handleExportPNG}
          style={{ padding: '10px', borderRadius: '6px', border: 'none', background: '#007acc', color: '#fff', cursor: 'pointer' }}
        >
          Export as PNG
        </button>

        <button
          onClick={handleExportPDF}
          style={{ padding: '10px', borderRadius: '6px', border: 'none', background: '#28a745', color: '#fff', cursor: 'pointer' }}
        >
          Export as PDF
        </button>

        <button
          onClick={onClose}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};