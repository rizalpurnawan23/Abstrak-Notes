import Dexie, { Table } from 'dexie';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

export interface Note {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  strokes: Stroke[];
}

export class NotesDatabase extends Dexie {
  notes!: Table<Note>;

  constructor() {
    super('AbstrakNotesDB');
    this.version(1).stores({
      notes: 'id, title, createdAt, updatedAt',
    });
  }
}

export const db = new NotesDatabase();