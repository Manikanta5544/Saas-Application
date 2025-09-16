import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { NotesAPI, TenantsAPI } from '../lib/api';
import { type Note } from '../lib/supabase';
import { NotesList } from './NotesList';
import { CreateNoteForm } from './CreateNoteForm';
import { 
  LogOut, 
  Building2, 
  Crown, 
  User, 
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export function Dashboard() {
  const { user, signOut, refreshUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const loadNotes = async () => {
    try {
      setError('');
      const notesData = await NotesAPI.getNotes();
      setNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleCreateNote = async (title: string, content: string) => {
    try {
      setError('');
      await NotesAPI.createNote(title, content);
      await loadNotes();
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      setError('');
      await NotesAPI.deleteNote(id);
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handleUpgrade = async () => {
    if (!user?.tenant) return;

    setUpgrading(true);
    try {
      await TenantsAPI.upgradeTenant(user.tenant.slug);
      await refreshUser();
      setUpgradeSuccess(true);
      setTimeout(() => setUpgradeSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade subscription');
    } finally {
      setUpgrading(false);
    }
  };

  if (!user) return null;

  const isAdmin = user.profile?.role === 'admin';
  const tenant = user.tenant;
  const isFreePlan = tenant?.subscription_plan === 'free';
  const noteLimit = tenant?.note_limit || 3;
  const canCreateNote = !isFreePlan || notes.length < noteLimit;

  const getTenantColor = (slug: string) => {
    return slug === 'acme' ? 'blue' : 'green';
  };

  const tenantColor = getTenantColor(tenant?.slug || 'acme');
  const colorClasses = {
    blue: {
      bg: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      text: 'text-blue-600',
      border: 'border-blue-200',
      bgLight: 'bg-blue-50',
    },
    green: {
      bg: 'bg-green-600',
      hover: 'hover:bg-green-700',
      text: 'text-green-600',
      border: 'border-green-200',
      bgLight: 'bg-green-50',
    },
  };

  const colors = colorClasses[tenantColor];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">NotesApp</h1>
              <div className="flex items-center space-x-2">
                <Building2 className={`h-5 w-5 ${colors.text}`} />
                <span className="font-semibold">{tenant?.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isFreePlan 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isFreePlan ? 'Free' : 'Pro'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isAdmin 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {isAdmin ? 'Admin' : 'Member'}
                </span>
              </div>
              
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Status & Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Subscription Status</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Plan: <strong>{isFreePlan ? 'Free' : 'Pro'}</strong></span>
                <span>Notes: <strong>{notes.length}</strong>{isFreePlan ? ` / ${noteLimit}` : ' (Unlimited)'}</span>
              </div>
              
              {isFreePlan && (
                <div className="mt-2">
                  <div className={"w-64 h-2 " + colors.bgLight + " rounded-full overflow-hidden"}>
                    <div 
                      className={"h-full " + colors.bg + " transition-all duration-300"}
                      style={{ width: `${Math.min((notes.length / noteLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {isAdmin && isFreePlan && (
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-3">
                  Upgrade to Pro for unlimited notes!
                </p>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className={`flex items-center space-x-2 ${colors.bg} text-white px-6 py-2 rounded-lg font-medium ${colors.hover} focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  <Crown className="h-4 w-4" />
                  <span>{upgrading ? 'Upgrading...' : 'Upgrade to Pro'}</span>
                </button>
              </div>
            )}
          </div>

          {upgradeSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Successfully upgraded to Pro! You now have unlimited notes.</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Your Notes</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadNotes}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  disabled={!canCreateNote}
                  className={`flex items-center space-x-2 ${colors.bg} text-white px-4 py-2 rounded-lg font-medium ${colors.hover} focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  <Plus className="h-4 w-4" />
                  <span>New Note</span>
                </button>
              </div>
            </div>

            {!canCreateNote && isFreePlan && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                You've reached the {noteLimit}-note limit for the Free plan. 
                {isAdmin && ' Upgrade to Pro for unlimited notes.'}
              </div>
            )}
          </div>

          <div className="p-6">
            {showCreateForm && (
              <div className="mb-6">
                <CreateNoteForm
                  onSubmit={handleCreateNote}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading notes...</span>
              </div>
            ) : (
              <NotesList notes={notes} onDelete={handleDeleteNote} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}