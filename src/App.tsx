import React, { useState, useRef, useEffect } from 'react';
import { Canvas, Stroke } from './components/Canvas';
import { Toolbar, PaperSize } from './components/Toolbar';
import { NoteList } from './components/NoteList';
import { ExportModal } from './components/ExportModal';
import { useNotesDB } from './hooks/useNotesDB';
import { Note } from './db/schema';

export const App: React.FC = () => {
  const { notes, createNote, deleteNote, renameNote, getNote, saveStrokes } = useNotesDB();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#000000');
  const [penSize, setPenSize] = useState<number>(3);
  const [zoom, setZoom] = useState<number>(1.0);
  const [paperSize, setPaperSize] = useState<PaperSize>('infinite');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const activeNote = notes.find((n: Note) => n.id === activeNoteId);

  useEffect(() => {
    if (!activeNoteId) {
      setStrokes([]);
      return;
    }

    getNote(activeNoteId).then((note) => {
      setStrokes(note?.strokes || []);
    });
  }, [activeNoteId, getNote]);

  const handleSelectNote = (id: string) => {
    if (id === activeNoteId) return;
    setActiveNoteId(id);
  };

  const handleCreateNote = async () => {
    const newId = await createNote('New Note');
    setStrokes([]);
    setActiveNoteId(newId);
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setStrokes([]);
    }
  };

  const handleRenameNote = async (id: string, newTitle: string) => {
    await renameNote(id, newTitle);
  };

  const handleManualSave = async () => {
    if (!activeNoteId) return;
    setIsSaving(true);
    await saveStrokes(activeNoteId, strokes);
    setTimeout(() => setIsSaving(false), 500);
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const nextMode = !prev;
      if (nextMode && color === '#000000') setColor('#ffffff');
      if (!nextMode && color === '#ffffff') setColor('#000000');
      return nextMode;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
        background: isDarkMode ? '#121212' : '#e8e8e8',
        color: isDarkMode ? '#f5f5f5' : '#333333',
      }}
    >
      {/* COLLAPSIBLE SIDEBAR */}
      <div
        style={{
          width: isSidebarOpen ? '250px' : '0px',
          background: isDarkMode ? '#252525' : '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          borderRight: isSidebarOpen ? `1px solid ${isDarkMode ? '#333' : '#ddd'}` : 'none',
          transition: 'width 0.25s ease',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <div
          style={{
            padding: '24px 16px',
            borderBottom: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              background: isDarkMode ? '#444' : '#ccc',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '10px', color: isDarkMode ? '#aaa' : '#666' }}>
              LOGO
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Abstrak Notes
          </h1>
        </div>

        <NoteList
          notes={notes}
          activeNoteId={activeNoteId}
          onSelect={handleSelectNote}
          onCreate={handleCreateNote}
          onRename={handleRenameNote}
          onDelete={handleDeleteNote}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* WORKSPACE */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Sidebar Toggle Button & Note Title */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: isDarkMode ? '#333' : '#e0e0e0',
              color: 'inherit',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            title="Toggle Sidebar"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>

          <span style={{ fontSize: '12px', color: isDarkMode ? '#aaa' : '#888' }}>
            {activeNote ? activeNote.title : 'No Note Selected'}
          </span>
        </div>

        <Toolbar
          activeTool={activeTool}
          setTool={setActiveTool}
          color={color}
          setColor={setColor}
          penSize={penSize}
          setPenSize={setPenSize}
          zoom={zoom}
          setZoom={setZoom}
          paperSize={paperSize}
          setPaperSize={setPaperSize}
          onClear={() => setClearTrigger((prev) => prev + 1)}
          isDarkMode={isDarkMode}
        />

        <Canvas
          ref={canvasRef}
          activeTool={activeTool}
          color={color}
          penSize={penSize}
          zoom={zoom}
          paperSize={paperSize}
          clearTrigger={clearTrigger}
          isDarkMode={isDarkMode}
          strokes={strokes}
          setStrokes={setStrokes}
        />

        {/* CONTROLS */}
        <div style={{ position: 'absolute', top: 16, right: 100, display: 'flex', gap: '8px', zIndex: 100 }}>
          <button
            onClick={handleManualSave}
            disabled={!activeNoteId}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: activeNoteId ? '#007acc' : '#666',
              color: '#fff',
              border: 'none',
              cursor: activeNoteId ? 'pointer' : 'not-allowed',
            }}
          >
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>

          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: isDarkMode ? '#444' : '#e0e0e0',
              color: isDarkMode ? '#fff' : '#000',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#333',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Export
          </button>
        </div>
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        canvasRef={canvasRef}
        noteTitle={activeNote?.title}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default App;