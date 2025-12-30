import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function ApplicationNotes({ applicationId, userId, userName, onNotesChange }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Fetch notes
  const fetchNotes = async () => {
    if (!applicationId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/applications/${applicationId}/notes`);
      const notesData = response.data.notes || [];
      // Sort by newest first
      const sortedNotes = notesData.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setNotes(sortedNotes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchNotes();
    }
  }, [applicationId, expanded]);

  // Add note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    if (!userId) {
      toast.error('You must be logged in to add notes');
      return;
    }

    setAddingNote(true);
    try {
      const response = await axios.post(`${API_BASE}/api/applications/${applicationId}/notes`, {
        userId,
        userName: userName || 'User',
        note: newNote.trim()
      });

      if (response.status === 201) {
        toast.success('Note added successfully');
        setNewNote('');
        fetchNotes(); // Refresh notes
        if (onNotesChange) {
          onNotesChange();
        }
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error(error.response?.data?.error || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    if (!userId) {
      toast.error('You must be logged in to delete notes');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_BASE}/api/applications/${applicationId}/notes/${noteId}`,
        {
          data: { userId },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.status === 200) {
        toast.success('Note deleted successfully');
        fetchNotes(); // Refresh notes
        if (onNotesChange) {
          onNotesChange();
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error(error.response?.data?.error || 'Failed to delete note');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mt-4 border-t border-base-300 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left mb-2 hover:text-primary transition-colors"
      >
        <span className="font-semibold text-base-content">
          <i className="fas fa-comments mr-2"></i>
          Notes ({notes.length})
        </span>
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-sm`}></i>
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Add note form */}
          <div className="bg-base-200 p-3 rounded-lg">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note or comment..."
              className="textarea textarea-bordered w-full min-h-[80px] mb-2"
              rows="3"
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim()}
              className="btn btn-sm btn-primary"
            >
              {addingNote ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Add Note
                </>
              )}
            </button>
          </div>

          {/* Notes list */}
          {loading ? (
            <div className="text-center py-4">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-4 text-base-content opacity-60">
              <i className="fas fa-comment-slash text-2xl mb-2"></i>
              <p>No notes yet. Be the first to add one!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="bg-base-200 p-3 rounded-lg border border-base-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold text-base-content">
                        {note.userName || 'User'}
                      </span>
                      <span className="text-xs opacity-60 ml-2">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    {note.userId === userId && (
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="btn btn-xs btn-ghost text-error hover:bg-error hover:text-error-content"
                        title="Delete note"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                  <p className="text-base-content whitespace-pre-wrap">{note.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

