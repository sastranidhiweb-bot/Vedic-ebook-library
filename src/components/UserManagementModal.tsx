import React, { useEffect, useState } from 'react';
import { fetchAllUsers, updateUser, User } from '../lib/userAdmin';

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ open, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<User>>({});
  // Inline edit handlers
  const handleEdit = (user: User) => {
    setEditUserId(user._id);
    setEditData({
      email: user.email,
      contactNo: user.contactNo,
      dob: user.dob,
      role: user.role,
      privilegeForBooks: Array.isArray(user.privilegeForBooks)
        ? user.privilegeForBooks
        : user.privilegeForBooks
        ? [user.privilegeForBooks]
        : []
    });
  };

  const handleEditChange = (field: keyof User, value: string | string[]) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };


  const handleEditSave = async (userId: string) => {
    try {
      const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token') || '';
      const updated = await updateUser(token, userId, editData);
      setUsers(users => users.map(u => u._id === userId ? updated : u));
      setEditUserId(null);
      setEditData({});
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleEditCancel = () => {
    setEditUserId(null);
    setEditData({});
  };

  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('vedic_auth_token') || sessionStorage.getItem('vedic_auth_token') || '';
        const data = await fetchAllUsers(token);
        setUsers(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'var(--modal-overlay)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'modalFadeIn 0.25s cubic-bezier(.4,2,.6,1)'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="vb-modal px-10 py-8 w-full max-w-6xl relative"
        style={{
          transform: 'scale(1)',
          transition: 'transform 0.2s',
        }}
      >
        <button
          className="absolute top-4 right-4 text-2xl font-bold transition-colors"
          style={{ color: 'var(--text-muted)', lineHeight: 1 }}
          onClick={onClose}
          title="Close"
        >
          &times;
        </button>
        <h2
          className="text-3xl font-extrabold mb-6 text-center tracking-tight"
          style={{ color: 'var(--accent-deep)', letterSpacing: '-0.01em', fontFamily: '"Gentium Plus", "Noto Serif Devanagari", Georgia, serif' }}
        >
          User Management
        </h2>
        <hr className="mb-6" style={{ borderColor: 'var(--border)' }} />
        {loading ? (
          <div className="text-center text-lg" style={{ color: 'var(--text-light)' }}>Loading users...</div>
        ) : error ? (
          <div className="text-center" style={{ color: 'var(--modal-error)' }}>{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full rounded-xl overflow-hidden shadow" style={{ border: '1px solid var(--border)' }}>
              <thead>
                <tr style={{ background: 'var(--card-hover)', color: 'var(--text)' }}>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Name</th>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Username</th>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Email</th>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Contact</th>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>DOB</th>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Role</th>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Privilege For Books</th>
                  <th className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user._id}
                    className="transition"
                    style={{ background: idx % 2 === 0 ? 'var(--card)' : 'var(--bg)', color: 'var(--text)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--card)' : 'var(--bg)')}
                  >
                    <td className="px-4 py-2 font-semibold" style={{ borderBottom: '1px solid var(--border)' }}>{user.name}</td>
                    <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{user.username}</td>
                    {editUserId === user._id ? (
                      <>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <input
                            className="rounded px-2 py-1 w-full"
                            style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                            value={editData.email || ''}
                            onChange={e => handleEditChange('email', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <input
                            className="rounded px-2 py-1 w-full"
                            style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                            value={editData.contactNo || ''}
                            onChange={e => handleEditChange('contactNo', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <input
                            className="rounded px-2 py-1 w-full"
                            style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                            type="date"
                            value={editData.dob ? new Date(editData.dob).toISOString().substring(0, 10) : ''}
                            onChange={e => handleEditChange('dob', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <select
                            className="rounded px-2 py-1 w-32 min-w-[8rem]"
                            style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                            value={editData.role || 'user'}
                            onChange={e => handleEditChange('role', e.target.value)}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="guest">guest</option>
                          </select>
                        </td>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="flex gap-2">
                            {['normal', 'special', 'private'].map(option => {
                              const active = editData.privilegeForBooks?.includes(option);
                              return (
                              <button
                                key={option}
                                type="button"
                                className="px-2 py-1 rounded"
                                style={active
                                  ? { background: 'var(--accent-deep)', color: 'var(--btn-primary-text)', border: '1px solid var(--accent-deep)' }
                                  : { background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--input-border)' }}
                                onClick={() => {
                                  const current = editData.privilegeForBooks || [];
                                  if (current.includes(option)) {
                                    handleEditChange('privilegeForBooks', current.filter(v => v !== option));
                                  } else {
                                    handleEditChange('privilegeForBooks', [...current, option]);
                                  }
                                }}
                              >
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                              </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center" style={{ borderBottom: '1px solid var(--border)' }}>
                          <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-sm transition-all mr-2" onClick={() => handleEditSave(user._id)}>Save</button>
                          <button className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow-sm transition-all" onClick={handleEditCancel}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{user.email}</td>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{user.contactNo}</td>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{user.dob ? new Date(user.dob).toLocaleDateString() : ''}</td>
                        <td className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>{user.role}</td>
                        <td className="px-4 py-2 text-center" style={{ borderBottom: '1px solid var(--border)' }}>
                          {Array.isArray(user.privilegeForBooks)
                            ? user.privilegeForBooks.join(', ')
                            : user.privilegeForBooks || 'normal'}
                        </td>
                        <td className="px-4 py-2 text-center" style={{ borderBottom: '1px solid var(--border)' }}>
                          <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-sm transition-all mr-2" onClick={() => handleEdit(user)}>Edit</button>
                          <button className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-sm transition-all" disabled>Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default UserManagementModal;
