import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, BookOpen, BookMarked, Heart, Share2, UserPlus, RefreshCw, TrendingUp, MapPin, Calendar, BarChart3, Download, X, Check, Clock, Mail, Send, MessageSquare, Library, Shield, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PERIODS = [
  { value: '1d', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'lifetime', label: 'All time' }
];

// User Management Component
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/user-type', {
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Fetched users:', result.users?.length, 'deleted:', result.users?.filter(u => u.deletedAt).length);
        setUsers(result.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`Are you sure you want to permanently delete ${email}?\n\nThis will remove:\n- Their account\n- All their books and queue\n- All their recommendations\n- All their referrals\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeleting(userId);
    setMessage({ type: '', text: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/admin/user-type?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `${email} has been deleted` });
        setExpandedUser(null);
        fetchUsers();
        // Auto-dismiss success message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete user' });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete user' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setDeleting(null);
    }
  };

  const handleExportUsers = () => {
    setExporting(true);
    try {
      const headers = [
        'Email', 'Name', 'User Type', 'Created', 'Last Sign In',
        'Birth Year', 'City', 'State', 'Country',
        'Favorite Genres', 'Favorite Bookstore', 'Favorite Authors',
        'Referral Code', 'Queued', 'Reading', 'Added', 
        'Recs Made', 'Recs Accepted', '% Acceptance', 'User ID'
      ];

      const rows = users.map(u => [
        u.email || '',
        u.name || '',
        u.userType || 'reader',
        u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
        u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString() : '',
        u.birthYear || '',
        u.city || '',
        u.state || '',
        u.country || '',
        Array.isArray(u.favoriteGenres) ? u.favoriteGenres.join('; ') : '',
        u.favoriteBookstore || '',
        Array.isArray(u.favoriteAuthors) ? u.favoriteAuthors.join('; ') : '',
        u.referralCode || '',
        u.booksQueued || 0,
        u.booksReading || 0,
        u.booksAdded || 0,
        u.recsMade || 0,
        u.recsAccepted || 0,
        u.recsMade > 0 ? `${Math.round((u.recsAccepted / u.recsMade) * 100)}%` : '0%',
        u.userId || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sarahs-books-users-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Filter out deleted users entirely, then apply search
  const filteredUsers = users
    .filter(u => !u.deletedAt)
    .filter(u => 
      !searchTerm || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getUserTypeBadge = (type) => {
    switch (type) {
      case 'admin':
        return <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">Admin</span>;
      case 'curator':
        return <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Curator</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Reader</span>;
    }
  };

  const activeUsers = users.filter(u => !u.deletedAt);

  return (
    <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#4A5940] flex items-center gap-2">
          <Users className="w-4 h-4" />
          User Management
          <span className="text-xs font-normal text-[#96A888]">({activeUsers.length} users)</span>
        </h3>
        <button
          onClick={handleExportUsers}
          disabled={exporting || users.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5F7252] bg-[#F8F6EE] hover:bg-[#E8EBE4] rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Exporting...' : 'Export All Users'}
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by email or name..."
        className="w-full px-3 py-2 text-sm border border-[#D4DAD0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5F7252]/20 focus:border-[#5F7252] mb-4"
      />

      {/* Messages - show at top */}
      {message.text && (
        <div className={`mb-4 p-2 rounded-lg text-sm ${
          message.type === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-700' 
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* User List */}
      {loading ? (
        <p className="text-sm text-[#96A888]">Loading users...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-sm text-[#96A888]">No users found.</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredUsers.map((user) => {
            const isExpanded = expandedUser === user.userId;
            return (
              <div key={user.userId} className="border border-[#E8EBE4] rounded-lg overflow-hidden">
                {/* User Row - Clickable */}
                <div 
                  className="flex items-center justify-between py-3 px-3 cursor-pointer hover:bg-[#F8F6EE]/50"
                  onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate text-[#4A5940]">
                        {user.name || user.email}
                      </p>
                      {getUserTypeBadge(user.userType)}
                    </div>
                    {user.name && <p className="text-xs text-[#96A888] truncate">{user.email}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-[#96A888] text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Profile */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-[#F8F6EE]/50 border-t border-[#E8EBE4]">
                    {/* Activity Stats Row */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3 pb-3 border-b border-[#E8EBE4]">
                      <div className="text-center p-2 bg-white rounded-lg border border-[#E8EBE4]">
                        <p className="text-lg font-semibold text-[#4A5940]">{user.booksQueued || 0}</p>
                        <p className="text-[10px] text-[#96A888]">Queued</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg border border-[#E8EBE4]">
                        <p className="text-lg font-semibold text-[#4A5940]">{user.booksReading || 0}</p>
                        <p className="text-[10px] text-[#96A888]">Reading</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg border border-[#E8EBE4]">
                        <p className="text-lg font-semibold text-[#4A5940]">{user.booksAdded || 0}</p>
                        <p className="text-[10px] text-[#96A888]">Added</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg border border-[#E8EBE4]">
                        <p className="text-lg font-semibold text-[#4A5940]">{user.recsMade || 0}</p>
                        <p className="text-[10px] text-[#96A888]">Recs Made</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg border border-[#E8EBE4]">
                        <p className="text-lg font-semibold text-[#4A5940]">{user.recsAccepted || 0}</p>
                        <p className="text-[10px] text-[#96A888]">Recs Accepted</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg border border-[#E8EBE4]">
                        <p className="text-lg font-semibold text-[#4A5940]">
                          {user.recsMade > 0 ? Math.round((user.recsAccepted / user.recsMade) * 100) : 0}%
                        </p>
                        <p className="text-[10px] text-[#96A888]">% Acceptance</p>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[#96A888]">Joined:</span>
                        <span className="ml-1 text-[#4A5940]">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#96A888]">Last Sign In:</span>
                        <span className="ml-1 text-[#4A5940]">{user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : 'Never'}</span>
                      </div>
                      <div>
                        <span className="text-[#96A888]">Birth Year:</span>
                        <span className="ml-1 text-[#4A5940]">{user.birthYear || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#96A888]">Location:</span>
                        <span className="ml-1 text-[#4A5940]">
                          {[user.city, user.state, user.country].filter(Boolean).join(', ') || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#96A888]">Referral Code:</span>
                        <span className="ml-1 text-[#4A5940] font-mono">{user.referralCode || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#96A888]">Favorite Bookstore:</span>
                        <span className="ml-1 text-[#4A5940]">{user.favoriteBookstore || 'N/A'}</span>
                      </div>
                    </div>
                    {user.favoriteGenres?.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="text-[#96A888]">Favorite Genres:</span>
                        <span className="ml-1 text-[#4A5940]">{user.favoriteGenres.join(', ')}</span>
                      </div>
                    )}
                    {user.favoriteAuthors?.length > 0 && (
                      <div className="mt-1 text-xs">
                        <span className="text-[#96A888]">Favorite Authors:</span>
                        <span className="ml-1 text-[#4A5940]">{user.favoriteAuthors.join(', ')}</span>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-[#E8EBE4] flex items-center justify-between">
                      <p className="text-[10px] text-[#96A888]">User ID: {user.userId}</p>
                      <button
                        onClick={() => handleDeleteUser(user.userId, user.email)}
                        disabled={deleting === user.userId}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deleting === user.userId ? 'Deleting...' : 'Delete User'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// Admin Management Component - Separate section for managing admin access
function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchAdmins = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/user-type', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const result = await response.json();
        // Filter to only admins
        setAdmins((result.users || []).filter(u => u.userType === 'admin'));
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setAdding(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/user-type', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newAdminEmail.trim(), userType: 'admin' })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `${newAdminEmail} is now an admin` });
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to add admin' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add admin' });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async (userId, email) => {
    if (!confirm(`Remove admin access for ${email}?`)) return;

    setRemoving(userId);
    setMessage({ type: '', text: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/user-type', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, userType: 'reader' })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `${email} is no longer an admin` });
        fetchAdmins();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove admin' });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
      <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Admin Access
      </h3>

      {/* Add Admin Form */}
      <form onSubmit={handleAddAdmin} className="flex gap-2 mb-4">
        <input
          type="email"
          value={newAdminEmail}
          onChange={(e) => setNewAdminEmail(e.target.value)}
          placeholder="Enter email to grant admin access..."
          className="flex-1 px-3 py-2 text-sm border border-[#D4DAD0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5F7252]/20 focus:border-[#5F7252]"
        />
        <button
          type="submit"
          disabled={adding || !newAdminEmail.trim()}
          className="px-4 py-2 bg-[#5F7252] text-white text-sm font-medium rounded-lg hover:bg-[#4A5940] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? 'Adding...' : 'Add Admin'}
        </button>
      </form>

      {/* Messages */}
      {message.text && (
        <div className={`mb-3 p-2 rounded-lg text-sm ${
          message.type === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-700' 
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Admin List */}
      {loading ? (
        <p className="text-sm text-[#96A888]">Loading admins...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-[#96A888]">No admins found.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.userId} className="flex items-center justify-between py-2 px-3 border border-[#E8EBE4] rounded-lg">
              <div>
                <p className="text-sm font-medium text-[#4A5940]">{admin.name || admin.email}</p>
                {admin.name && <p className="text-xs text-[#96A888]">{admin.email}</p>}
              </div>
              <button
                onClick={() => handleRemoveAdmin(admin.userId, admin.email)}
                disabled={removing === admin.userId}
                className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {removing === admin.userId ? '...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, onClick }) {
  return (
    <div 
      className={`bg-white rounded-xl border border-[#E8EBE4] p-4 sm:p-5 ${onClick ? 'cursor-pointer hover:border-[#5F7252] hover:shadow-md transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-[#5F7252]/10 rounded-lg">
          <Icon className="w-5 h-5 text-[#5F7252]" />
        </div>
        {onClick && <span className="text-xs text-[#96A888]">Click to view</span>}
      </div>
      <div className="text-2xl font-semibold text-[#4A5940] mb-1">{value}</div>
      <div className="text-sm font-medium text-[#5F7252]">{title}</div>
      {subtitle && <div className="text-xs text-[#96A888] mt-1">{subtitle}</div>}
    </div>
  );
}

function DetailModal({ isOpen, onClose, title, type, icon: Icon }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBooks, setUserBooks] = useState(null);
  const [noteModal, setNoteModal] = useState({ isOpen: false, book: null });
  const [noteContent, setNoteContent] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [sentNotes, setSentNotes] = useState(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setUserBooks(null);
      return;
    }
    
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`/api/admin/details?type=${type}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (response.ok) {
          const result = await response.json();
          setData(result.data);
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, type]);

  const fetchUserDetails = async (detailType, userId, email) => {
    setSelectedUser({ userId, email });
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/admin/details?type=${detailType}&userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setUserBooks(result.data);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendNote = async () => {
    if (!noteContent.trim() || !noteModal.book || !selectedUser) return;
    
    setSendingNote(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/send-note', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser.userId,
          userEmail: selectedUser.email,
          bookId: noteModal.book.bookId,
          bookTitle: noteModal.book.title,
          bookAuthor: noteModal.book.author,
          noteContent: noteContent.trim()
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Use queueId as unique identifier (bookId can be null)
        setSentNotes(prev => new Set([...prev, noteModal.book.queueId || noteModal.book.bookId]));
        setNoteModal({ isOpen: false, book: null });
        setNoteContent('');
        alert(result.message || 'Note sent!');
      } else {
        alert(result.error || 'Failed to send note');
      }
    } catch (err) {
      console.error('Error sending note:', err);
      alert('Failed to send note');
    } finally {
      setSendingNote(false);
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-[#5F7252] animate-spin" />
        </div>
      );
    }

    if (!data || data.length === 0) {
      return <p className="text-center text-[#96A888] py-8">No data available</p>;
    }

    switch (type) {
      case 'users':
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4A5940]">{u.email}</p>
                  {u.createdAt && <p className="text-xs text-[#96A888]">Joined {new Date(u.createdAt).toLocaleDateString()}</p>}
                </div>
                {u.hasProfile ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Profile</span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">No profile</span>
                )}
              </div>
            ))}
          </div>
        );

      case 'profiles':
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((p, i) => (
              <div key={i} className="py-2.5">
                <p className="text-sm text-[#4A5940] font-medium">{p.email}</p>
                <div className="text-xs text-[#7A8F6C] mt-1 space-y-0.5">
                  {p.city && <p>📍 {[p.city, p.state, p.country].filter(Boolean).join(', ')}</p>}
                  {p.birthYear && <p>🎂 Born {p.birthYear}</p>}
                  {p.genres?.length > 0 && <p>📚 {p.genres.slice(0, 3).join(', ')}</p>}
                  {p.bookstore && <p>🏪 {p.bookstore}</p>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'queue':
        // If viewing a specific user's books
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Queue</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                      <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                      {b.addedAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.addedAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.status === 'reading' && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Reading</span>}
                      {b.status === 'want_to_read' && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Want to Read</span>}
                      {b.owned && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Owned</span>}
                      {(b.noteSent || sentNotes.has(b.queueId || b.bookId)) ? (
                        <button
                          onClick={() => setNoteModal({ isOpen: true, book: b, viewOnly: true })}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200 transition-colors"
                          title="Click to view note"
                        >
                          <Check className="w-3 h-3" /> Sent
                        </button>
                      ) : (
                        <button
                          onClick={() => setNoteModal({ isOpen: true, book: b, viewOnly: false })}
                          className="text-xs bg-[#5F7252] text-white px-2 py-1 rounded hover:bg-[#4A5940] transition-colors flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" /> Note
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with book counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('queue-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <div>
                  <p className="text-sm text-[#4A5940] font-medium">{u.name || u.email}</p>
                  {u.name && <p className="text-xs text-[#96A888]">{u.email}</p>}
                </div>
                <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                  {u.bookCount} {u.bookCount === 1 ? 'book' : 'books'}
                </span>
              </button>
            ))}
          </div>
        );

      case 'reading':
        // Currently reading books - if viewing a specific user's books
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Currently Reading</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                      <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                      {b.addedAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.addedAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with book counts (clickable to drill down)
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('reading-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <div>
                  <p className="text-sm text-[#4A5940] font-medium">{u.name || u.email}</p>
                  {u.name && <p className="text-xs text-[#96A888]">{u.email}</p>}
                </div>
                <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                  {u.bookCount} {u.bookCount === 1 ? 'book' : 'books'}
                </span>
              </button>
            ))}
          </div>
        );

      case 'finished':
        // If viewing a specific user's finished books
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Books Read</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                      <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                      {b.addedAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.addedAt).toLocaleDateString()}</p>}
                    </div>
                    {b.rating && (
                      <span className="text-sm text-[#C97B7B]">{'♥'.repeat(b.rating)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with book counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('finished-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <div>
                  <p className="text-sm text-[#4A5940] font-medium">{u.name || u.email}</p>
                  {u.name && <p className="text-xs text-[#96A888]">{u.email}</p>}
                </div>
                <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                  {u.bookCount} {u.bookCount === 1 ? 'book' : 'books'}
                </span>
              </button>
            ))}
          </div>
        );

      case 'collection':
        // If viewing a specific user's collection
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Collection</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                      <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                      {b.addedAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.addedAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.status === 'read' && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Read</span>}
                      {b.rating && <span className="text-xs text-[#C97B7B]">{'♥'.repeat(b.rating)}</span>}
                      {b.inAdminCollection && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Match</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with book counts and overlap %
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('collection-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <div>
                  <p className="text-sm text-[#4A5940] font-medium">{u.name || u.email}</p>
                  {u.name && <p className="text-xs text-[#96A888]">{u.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {u.overlapPercent > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      {u.overlapPercent}% match
                    </span>
                  )}
                  <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                    {u.bookCount} {u.bookCount === 1 ? 'book' : 'books'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        );

      case 'waitlist':
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((w, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <p className="text-sm text-[#4A5940]">{w.email}</p>
                {w.signedUpAt && <p className="text-xs text-[#96A888]">{new Date(w.signedUpAt).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        );

      case 'betaTesters':
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((b, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4A5940]">{b.email}</p>
                  {b.interestedFeatures?.length > 0 && (
                    <p className="text-xs text-[#96A888]">{b.interestedFeatures.join(', ')}</p>
                  )}
                </div>
                {b.createdAt && <p className="text-xs text-[#96A888]">{new Date(b.createdAt).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        );

      case 'sharing':
        // Show sharers with their recs made, accepted, and acceptance rate
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((s, i) => {
              const acceptRate = s.totalShares > 0 ? Math.round((s.accepted / s.totalShares) * 100) : 0;
              return (
                <div key={i} className="py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-[#4A5940]">{s.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full">
                        {s.totalShares} recs
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {s.accepted} accepted
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        acceptRate >= 75 ? 'bg-emerald-100 text-emerald-700' :
                        acceptRate >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {acceptRate}%
                      </span>
                    </div>
                  </div>
                  <div className="pl-2 space-y-1">
                    {s.books.slice(0, 3).map((b, j) => (
                      <div key={j} className="text-xs text-[#7A8F6C] flex items-center justify-between">
                        <span className="truncate flex-1">{b.title} <span className="text-[#96A888]">by {b.author}</span></span>
                        {b.shareCount > 1 && (
                          <span className="text-[#96A888] ml-2">shared ×{b.shareCount}</span>
                        )}
                      </div>
                    ))}
                    {s.books.length > 3 && (
                      <p className="text-xs text-[#96A888]">+{s.books.length - 3} more books</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'recommendations':
        // If viewing a specific user's recommendations
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Recommendations</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.books?.map((b, i) => (
                  <div key={i} className="py-2.5">
                    <p className="text-sm text-[#4A5940] font-medium">{b.title}</p>
                    <p className="text-xs text-[#7A8F6C]">by {b.author}</p>
                    {b.createdAt && <p className="text-xs text-[#96A888] mt-1">{new Date(b.createdAt).toLocaleDateString()}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with rec counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('recommendations-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <p className="text-sm text-[#4A5940]">{u.email}</p>
                <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                  {u.recCount} {u.recCount === 1 ? 'rec' : 'recs'}
                </span>
              </button>
            ))}
          </div>
        );

      case 'referrals':
        // If viewing a specific user's referrals
        if (selectedUser && userBooks) {
          return (
            <div>
              <button
                onClick={() => { setSelectedUser(null); setUserBooks(null); }}
                className="text-xs text-[#5F7252] hover:text-[#4A5940] mb-3 flex items-center gap-1"
              >
                ← Back to all users
              </button>
              <p className="text-sm font-medium text-[#4A5940] mb-3">{selectedUser.email}'s Referrals</p>
              <div className="divide-y divide-[#E8EBE4] max-h-80 overflow-y-auto">
                {userBooks.referrals?.map((r, i) => (
                  <div key={i} className="py-2.5 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#4A5940]">{r.invitedEmail}</p>
                      <p className="text-xs text-[#96A888] mt-0.5">
                        {r.type === 'link' ? '🔗 Link' : '📧 Email'}{r.createdAt && ` • ${new Date(r.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    {r.status === 'accepted' ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3 h-3" /> Joined
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // Show users with referral counts
        return (
          <div className="divide-y divide-[#E8EBE4] max-h-96 overflow-y-auto">
            {data.map((u, i) => (
              <button
                key={i}
                onClick={() => fetchUserDetails('referrals-user', u.userId, u.email)}
                className="w-full py-2.5 flex items-center justify-between hover:bg-[#F8F6EE] transition-colors text-left px-1 -mx-1 rounded"
              >
                <p className="text-sm text-[#4A5940]">{u.email}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    {u.accepted} joined
                  </span>
                  <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full font-medium">
                    {u.refCount} sent
                  </span>
                </div>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-[#E8EBE4]">
          <div className="flex items-center justify-between p-4 border-b border-[#E8EBE4]">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-[#5F7252]" />}
              <h2 className="text-lg font-semibold text-[#4A5940]">{title}</h2>
              {data && <span className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-0.5 rounded-full">{data.length} {data.length === 1 ? 'user' : 'users'}</span>}
            </div>
            <div className="flex items-center gap-2">
              {data && data.length > 0 && (
                <button 
                  onClick={() => {
                    // Export data as CSV
                    const escapeCSV = (val) => {
                      if (val === null || val === undefined) return '';
                      const str = String(val);
                      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                      }
                      return str;
                    };
                    
                    let csv = '';
                    if (type === 'queue' || type === 'finished' || type === 'collection') {
                      csv = 'Name,Email,Book Count\n';
                      data.forEach(u => {
                        csv += `${escapeCSV(u.name || '')},${escapeCSV(u.email)},${u.bookCount}\n`;
                      });
                    } else if (type === 'sharing') {
                      csv = 'Name,Recs Made,Accepted,Acceptance Rate\n';
                      data.forEach(s => {
                        const rate = s.totalShares > 0 ? Math.round((s.accepted / s.totalShares) * 100) : 0;
                        csv += `${escapeCSV(s.name)},${s.totalShares},${s.accepted},${rate}%\n`;
                      });
                    } else if (type === 'users') {
                      csv = 'Name,Email,Created At,Has Profile\n';
                      data.forEach(u => {
                        csv += `${escapeCSV(u.name || '')},${escapeCSV(u.email)},${u.createdAt?.split('T')[0] || ''},${u.hasProfile ? 'Yes' : 'No'}\n`;
                      });
                    } else if (type === 'referrals') {
                      csv = 'Email,Sent,Accepted,K-Factor\n';
                      data.forEach(u => {
                        csv += `${escapeCSV(u.email)},${u.refCount || 0},${u.acceptedCount || 0},${u.kFactor || '0'}\n`;
                      });
                    } else {
                      csv = 'Data\n';
                      data.forEach(d => csv += `${JSON.stringify(d)}\n`);
                    }
                    
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sarahs-books-${type}-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-1.5 hover:bg-[#E8EBE4] rounded-lg transition-colors"
                  title="Export as CSV"
                >
                  <Download className="w-4 h-4 text-[#5F7252]" />
                </button>
              )}
              <button onClick={onClose} className="p-1 hover:bg-[#E8EBE4] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#96A888]" />
              </button>
            </div>
          </div>
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Note Modal */}
      {noteModal.isOpen && noteModal.book && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#E8EBE4]">
            <div className={`p-4 ${noteModal.viewOnly ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-[#5F7252] to-[#4A5940]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  {noteModal.viewOnly ? <Check className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                  <h3 className="font-semibold">{noteModal.viewOnly ? 'Note Sent' : 'Send Personal Note'}</h3>
                </div>
                <button 
                  onClick={() => { setNoteModal({ isOpen: false, book: null }); setNoteContent(''); }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Book info */}
              <div className={`rounded-lg p-3 mb-4 border-l-4 ${noteModal.viewOnly ? 'bg-green-50 border-green-500' : 'bg-[#F8F6EE] border-[#5F7252]'}`}>
                <p className="text-sm font-medium text-[#4A5940]">{noteModal.book.title}</p>
                <p className="text-xs text-[#7A8F6C]">by {noteModal.book.author}</p>
                <p className="text-xs text-[#96A888] mt-1">To: {selectedUser?.email}</p>
                {noteModal.viewOnly && noteModal.book.noteSentAt && (
                  <p className="text-xs text-green-600 mt-1">Sent: {new Date(noteModal.book.noteSentAt).toLocaleDateString()}</p>
                )}
              </div>
              
              {noteModal.viewOnly ? (
                <>
                  <label className="block text-xs text-green-600 font-medium mb-2">
                    Your note:
                  </label>
                  <div className="w-full p-3 bg-gray-50 border border-[#E8EBE4] rounded-lg text-sm text-[#4A5940] whitespace-pre-wrap">
                    {noteModal.book.noteContent || 'Note content not available'}
                  </div>
                </>
              ) : (
                <>
                  {/* Note input */}
                  <label className="block text-xs text-[#5F7252] font-medium mb-2">
                    Why I love this book...
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Share your personal thoughts about this book..."
                    className="w-full h-32 p-3 border border-[#E8EBE4] rounded-lg text-sm text-[#4A5940] placeholder-[#96A888] focus:outline-none focus:ring-2 focus:ring-[#5F7252]/30 focus:border-[#5F7252] resize-none"
                  />
                  
                  {/* Quick starters */}
                  <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                    <button
                      onClick={() => setNoteContent(prev => prev + "This is one of my all-time favorites because ")}
                      className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-1 rounded hover:bg-[#D8DBD4] transition-colors"
                    >
                      All-time favorite...
                    </button>
                    <button
                      onClick={() => setNoteContent(prev => prev + "I think you'll especially love ")}
                      className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-1 rounded hover:bg-[#D8DBD4] transition-colors"
                    >
                      You'll love...
                    </button>
                    <button
                      onClick={() => setNoteContent(prev => prev + "The writing style is ")}
                      className="text-xs bg-[#E8EBE4] text-[#5F7252] px-2 py-1 rounded hover:bg-[#D8DBD4] transition-colors"
                    >
                      Writing style...
                    </button>
                  </div>
                  
                  {/* Send button */}
                  <button
                    onClick={sendNote}
                    disabled={!noteContent.trim() || sendingNote}
                    className="w-full bg-gradient-to-r from-[#5F7252] to-[#4A5940] text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNote ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Note to {selectedUser?.email?.split('@')[0]}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProgressBar({ label, value, percent, tooltip }) {
  return (
    <div className="mb-3 group relative">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#5F7252] flex items-center gap-1">
          {label}
          {tooltip && (
            <span 
              className="cursor-help text-[#96A888] hover:text-[#5F7252] inline-flex items-center justify-center w-4 h-4 text-[10px] border border-[#D4DAD0] rounded-full"
              title={tooltip}
            >?</span>
          )}
        </span>
        <span className="text-[#96A888]">{value} ({percent}%)</span>
      </div>
      <div className="h-2 bg-[#E8EBE4] rounded-full overflow-hidden">
        <div className="h-full bg-[#5F7252] rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function WaitlistSection({ title, icon: Icon, items, type, showFeatures, onDelete }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (email) => {
    if (!confirm(`Remove ${email} from ${title}?`)) return;
    setDeleting(email);
    try {
      await onDelete(email);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
      <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[#E8EBE4] last:border-0 group">
            <div className="flex-1 min-w-0">
              <span className="text-[#4A5940]">{item.email}</span>
              {showFeatures && item.interestedFeatures?.length > 0 && (
                <span className="text-xs text-[#96A888] ml-2">({item.interestedFeatures.join(', ')})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#96A888]">
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
              </span>
              <button
                onClick={() => handleDelete(item.email)}
                disabled={deleting === item.email}
                className="px-2 py-1 text-xs text-[#5F7252] bg-[#5F7252]/10 hover:bg-[#5F7252]/20 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {deleting === item.email ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('lifetime');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: null, title: '', icon: null });

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/export', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sarahs-books-users-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const sendDigest = async () => {
    setSendingDigest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/digest', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const result = await response.json();
      if (response.ok) {
        alert('Digest email sent successfully!');
      } else {
        alert('Failed to send digest: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Digest error:', err);
      alert('Failed to send digest: ' + err.message);
    } finally {
      setSendingDigest(false);
    }
  };

  // Skeleton shimmer component
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-[#E8EBE4] p-4 sm:p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-[#E8EBE4] rounded-lg" />
      </div>
      <div className="h-7 w-16 bg-[#E8EBE4] rounded mb-2" />
      <div className="h-4 w-24 bg-[#E8EBE4] rounded mb-1" />
      <div className="h-3 w-20 bg-[#E8EBE4] rounded" />
    </div>
  );

  const SkeletonSection = ({ rows = 4 }) => (
    <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 animate-pulse">
      <div className="h-5 w-40 bg-[#E8EBE4] rounded mb-4" />
      <div className="space-y-3">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="h-4 bg-[#E8EBE4] rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header skeleton */}
          <div className="mb-6 animate-pulse">
            <div className="h-4 w-24 bg-[#E8EBE4] rounded mb-4" />
            <div className="h-8 w-48 bg-[#E8EBE4] rounded" />
          </div>
          {/* Stats grid skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          {/* Sections skeleton */}
          <SkeletonSection rows={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-[#5F7252] text-white rounded-lg hover:bg-[#4A5940]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FDFBF4 0%, #FBF9F0 50%, #F5EFDC 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-[#5F7252] hover:text-[#4A5940] transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#4A5940]" style={{ fontFamily: 'Crimson Pro' }}>
                Admin Dashboard
              </h1>
              {lastUpdated && (
                <p className="text-xs text-[#96A888] mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-[#D4DAD0] rounded-lg text-sm text-[#4A5940] bg-white focus:outline-none focus:ring-2 focus:ring-[#5F7252]"
              >
                {PERIODS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="p-2 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-[#5F7252] ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportCSV}
                disabled={exporting}
                className="p-2 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Export CSV"
              >
                <Download className={`w-4 h-4 text-[#5F7252] ${exporting ? 'animate-pulse' : ''}`} />
              </button>
              <button
                onClick={sendDigest}
                disabled={sendingDigest}
                className="p-2 border border-[#D4DAD0] rounded-lg hover:bg-[#F8F6EE] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                title="Send Test Digest Email"
              >
                <Mail className={`w-4 h-4 text-[#5F7252] ${sendingDigest ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        {/* Core Stats - 4 cards per row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Total Users"
            value={stats?.users?.total || 0}
            subtitle={period !== 'lifetime' ? `+${stats?.users?.inPeriod || 0} in period` : `${stats?.users?.withProfiles || 0} with profiles`}
            icon={Users}
            onClick={() => setModal({ isOpen: true, type: 'users', title: 'All Users', icon: Users })}
          />
          <StatCard
            title="Want to Read"
            value={stats?.queue?.wantToRead || 0}
            subtitle={`${stats?.queue?.wantToReadUsers || 0} users`}
            icon={BookMarked}
            onClick={() => setModal({ isOpen: true, type: 'queue', title: 'Want to Read', icon: BookMarked })}
          />
          <StatCard
            title="Currently Reading"
            value={stats?.queue?.reading || 0}
            subtitle={`${stats?.queue?.readingUsers || 0} users`}
            icon={BookOpen}
            onClick={() => setModal({ isOpen: true, type: 'reading', title: 'Currently Reading', icon: BookOpen })}
          />
          <StatCard
            title="Books Added"
            value={stats?.queue?.alreadyRead || 0}
            subtitle={`${stats?.queue?.alreadyReadUsers || 0} users`}
            icon={Library}
            onClick={() => setModal({ isOpen: true, type: 'collection', title: 'Books Added to Collection', icon: Library })}
          />
        </div>

        {/* Engagement Stats - 6 cards per row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <StatCard
            title="Recs Made"
            value={stats?.sharing?.totalShares || 0}
            subtitle={`by ${stats?.sharing?.uniqueSharers || 0} users`}
            icon={Share2}
            onClick={() => setModal({ isOpen: true, type: 'sharing', title: 'Recommendations Made', icon: Share2 })}
          />
          <StatCard
            title="Recs Accepted"
            value={stats?.sharing?.accepted || 0}
            subtitle={`${stats?.sharing?.totalShares > 0 ? Math.round((stats?.sharing?.accepted / stats?.sharing?.totalShares) * 100) : 0}% accept rate`}
            icon={Check}
          />
          <StatCard
            title="Referrals"
            value={`${stats?.referrals?.accepted || 0} / ${stats?.referrals?.sent || 0}`}
            subtitle={`${Math.round((stats?.referrals?.conversionRate || 0) * 100)}% conversion`}
            icon={Share2}
            onClick={() => setModal({ isOpen: true, type: 'referrals', title: 'Referrals', icon: Share2 })}
          />
          <StatCard
            title="Platform K-Factor"
            value={stats?.referrals?.platformKFactor || '0.00'}
            subtitle="Viral coefficient"
            icon={TrendingUp}
          />
          <StatCard
            title="Curator Waitlist"
            value={stats?.curatorWaitlist?.total || 0}
            subtitle="Pending curators"
            icon={UserPlus}
            onClick={() => setModal({ isOpen: true, type: 'waitlist', title: 'Curator Waitlist', icon: UserPlus })}
          />
          <StatCard
            title="Beta Testers"
            value={stats?.betaTesters?.total || 0}
            subtitle="Read with Friends"
            icon={Users}
            onClick={() => setModal({ isOpen: true, type: 'betaTesters', title: 'Beta Testers', icon: Users })}
          />
        </div>

        {/* Platform Health Metrics */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#4A5940] flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Platform Health
            </h3>
            {stats?.dataQualityScore != null && (
              <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#5F7252]/10 text-[#5F7252]">
                {stats.dataQualityScore}/100
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            <ProgressBar
              label="Profile Completeness"
              value=""
              percent={stats?.dataQuality?.profileCompleteness || 0}
              tooltip="% of users who have filled out their profile (genres, location, etc.)"
            />
            <ProgressBar
              label="Engagement Rate"
              value=""
              percent={stats?.dataQuality?.engagementRate || 0}
              tooltip="% of users who have added at least one book to their queue or collection"
            />
            <ProgressBar
              label="Rating Density"
              value=""
              percent={stats?.dataQuality?.ratingDensity || 0}
              tooltip="% of finished books that have been rated by users"
            />
            <ProgressBar
              label="Referral Health"
              value=""
              percent={stats?.dataQuality?.referralHealth || 0}
              tooltip="Referral conversion rate - % of sent referrals that resulted in signups"
            />
          </div>
        </div>

        {/* K-Factor Leaderboard */}
        {stats?.referrals?.topReferrers?.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Referrers (K-Factor Leaderboard)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#96A888] border-b border-[#E8EBE4]">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium text-right">Sent</th>
                    <th className="pb-2 font-medium text-right">Accepted</th>
                    <th className="pb-2 font-medium text-right">K-Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.referrals.topReferrers.map((r, i) => (
                    <tr key={i} className="border-b border-[#E8EBE4] last:border-0">
                      <td className="py-2 text-[#5F7252] font-medium">{i + 1}</td>
                      <td className="py-2 text-[#4A5940]">{r.email}</td>
                      <td className="py-2 text-right text-[#7A8F6C]">{r.sent}</td>
                      <td className="py-2 text-right text-[#5F7252] font-medium">{r.accepted}</td>
                      <td className="py-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          parseFloat(r.kFactor) >= 0.5 ? 'bg-green-100 text-green-700' :
                          parseFloat(r.kFactor) >= 0.25 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {r.kFactor}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Curator Waitlist & Beta Testers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {stats?.curatorWaitlist?.recent?.length > 0 && (
            <WaitlistSection
              title="Become a Curator Waitlist"
              icon={UserPlus}
              items={stats.curatorWaitlist.recent}
              type="curator"
              onDelete={async (email) => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;
                const res = await fetch(`/api/admin/waitlist?type=curator&email=${encodeURIComponent(email)}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (res.ok) fetchStats();
              }}
            />
          )}

          {stats?.betaTesters?.recent?.length > 0 && (
            <WaitlistSection
              title="Read with Friends Beta Users"
              icon={Users}
              items={stats.betaTesters.recent}
              type="beta"
              showFeatures
              onDelete={async (email) => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;
                const res = await fetch(`/api/admin/waitlist?type=beta&email=${encodeURIComponent(email)}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (res.ok) fetchStats();
              }}
            />
          )}
        </div>

        {/* Top Genres */}
        <div className="bg-white rounded-xl border border-[#E8EBE4] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#4A5940] flex items-center gap-2">
              <BookMarked className="w-4 h-4" />
              Top Genres
            </h3>
            <select
              className="text-xs px-2 py-1 border border-[#D4DAD0] rounded-lg text-[#5F7252] bg-white focus:outline-none focus:ring-1 focus:ring-[#5F7252]"
              defaultValue="profile"
              title="Filter by data source (more sources coming soon)"
            >
              <option value="profile">Profile Preferences</option>
              <option value="queue" disabled>In Reading Queue (coming soon)</option>
              <option value="collection" disabled>In Collections (coming soon)</option>
              <option value="searched" disabled>Searched (coming soon)</option>
              <option value="recommended" disabled>Recommended (coming soon)</option>
            </select>
          </div>
          {stats?.demographics?.topGenres?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {stats.demographics.topGenres.slice(0, 6).map((g, i) => (
                <ProgressBar
                  key={i}
                  label={g.genre}
                  value={g.count}
                  percent={g.percent}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#96A888] italic">No genre preferences yet</p>
          )}
        </div>

        {/* Demographics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Countries */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Users by Country
            </h3>
            {stats?.demographics?.byCountry?.length > 0 ? (
              <div className="space-y-2">
                {stats.demographics.byCountry.slice(0, 5).map((c, i) => (
                  <ProgressBar
                    key={i}
                    label={c.country}
                    value={c.count}
                    percent={c.percent}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#96A888] italic">No location data yet</p>
            )}
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-xl border border-[#E8EBE4] p-5">
            <h3 className="text-sm font-semibold text-[#4A5940] mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Age Distribution
            </h3>
            {stats?.demographics?.ageDistribution?.some(a => a.count > 0) ? (
              <div className="space-y-2">
                {stats.demographics.ageDistribution.map((a, i) => (
                  <ProgressBar
                    key={i}
                    label={a.range}
                    value={a.count}
                    percent={a.percent}
                    color={a.range === '25-34' ? 'bg-[#5F7252]' : 'bg-[#96A888]'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#96A888] italic">No age data yet</p>
            )}
          </div>
        </div>

        {/* User Management */}
        <div className="mb-6">
          <UserManagement />
        </div>

        {/* Admin Access */}
        <AdminManagement />

        {/* Detail Modal */}
        <DetailModal
          isOpen={modal.isOpen}
          onClose={() => setModal({ isOpen: false, type: null, title: '', icon: null })}
          title={modal.title}
          type={modal.type}
          icon={modal.icon}
        />
      </div>
    </div>
  );
}
