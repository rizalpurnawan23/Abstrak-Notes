import React, { useState } from 'react';
import { Note } from '../db/schema';

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  isDarkMode?: boolean;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  activeNoteId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  isDarkMode = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(note.id);
    setEditTitle(note.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
      <button
        onClick={onCreate}
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid #ccc',
          background: isDarkMode ? '#333' : '#fff',
          color: isDarkMode ? '#fff' : '#333',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        + New Note
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
        {notes.map((note) => {
          const isActive = note.id === activeNoteId;
          const isEditing = note.id === editingId;

          return (
            <div
              key={note.id}
              onClick={() => onSelect(note.id)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: isActive ? (isDarkMode ? '#333' : '#e6e6e6') : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleSaveRename(note.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(note.id)}
                  autoFocus
                  style={{ width: '100%', padding: '2px 4px', fontSize: '14px' }}
                />
              ) : (
                <span style={{ fontSize: '14px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.title}
                </span>
              )}

              <div style={{ display: 'flex', gap: '4px' }}>
                {!isEditing && (
                  <button
                    onClick={(e) => handleStartRename(note, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                    title="Rename"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};