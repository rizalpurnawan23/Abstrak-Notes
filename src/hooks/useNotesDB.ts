import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Note } from '../db/schema';
import { Stroke } from '../components/Canvas';

export const useNotesDB = () => {
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];

  const createNote = async (title = 'Untitled Note'): Promise<string> => {
    const id = Date.now().toString();
    const now = Date.now();
    await db.notes.add({
      id,
      title,
      createdAt: now,
      updatedAt: now,
      strokes: [],
    });
    return id;
  };

  const getNote = useCallback(async (id: string): Promise<Note | undefined> => {
    return await db.notes.get(id);
  }, []);

  const saveStrokes = async (id: string, strokes: Stroke[]) => {
    await db.notes.update(id, {
      strokes,
      updatedAt: Date.now(),
    });
  };

  const renameNote = async (id: string, title: string) => {
    await db.notes.update(id, {
      title,
      updatedAt: Date.now(),
    });
  };

  const deleteNote = async (id: string) => {
    await db.notes.delete(id);
  };

  return {
    notes,
    createNote,
    getNote,
    saveStrokes,
    renameNote,
    updateTitle: renameNote,
    deleteNote,
  };
};