import React, { useState } from 'react';
import { type Note } from '../lib/supabase';
import { NotesAPI } from '../lib/api';
import { 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Calendar,
  FileText
} from 'lucide-react';

interface NotesListProps {
  notes: Note[];
  onDelete: (id: string) => Promise<void>;
}

export function NotesList({ notes, onDelete }: NotesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || '');
  };

  const handleSave = async (id: string) => {
    setLoading(id);
    try {
      await NotesAPI.updateNote(id, editTitle, editContent);
      setEditingId(null);
      window.location.reload();
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    setLoading(id);
    try {
      await onDelete(id);
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
        <p className="text-gray-500">Create your first note to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div key={note.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          {editingId === note.id ? (
            // Edit mode
            <div className="space-y-4">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Note title"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Note content"
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSave(note.id)}
                  disabled={loading === note.id || !editTitle.trim()}
                  className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading === note.id ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <div>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit note"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={loading === note.id}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {note.content && (
                <p className="text-gray-600 mb-3 whitespace-pre-wrap">{note.content}</p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {formatDate(note.created_at)}</span>
                </div>
                {note.updated_at !== note.created_at && (
                  <div className="flex items-center space-x-1">
                    <span>Updated: {formatDate(note.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}