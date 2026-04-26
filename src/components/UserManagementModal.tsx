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
        background: 'linear-gradient(120deg, rgba(30,32,38,0.32) 0%, rgba(224,231,255,0.18) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'modalFadeIn 0.25s cubic-bezier(.4,2,.6,1)'
      }}
    >
      <div
        className="rounded-2xl shadow-2xl px-10 py-8 w-full max-w-6xl relative border border-amber-100"
        style={{
          background: 'linear-gradient(120deg, #fff 60%, #fef6e4 100%)',
          color: '#222',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
          transform: 'scale(1)',
          transition: 'transform 0.2s',
        }}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors"
          onClick={onClose}
          title="Close"
        >
          &times;
        </button>
        <h2 className="text-3xl font-extrabold mb-6 text-center tracking-tight text-amber-700 drop-shadow-sm" style={{ letterSpacing: '-0.01em' }}>
          User Management
        </h2>
        <hr className="mb-6 border-amber-100" />
        {loading ? (
          <div className="text-center text-lg text-yellow-600">Loading users...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full rounded-xl overflow-hidden shadow border border-amber-100">
              <thead>
                <tr className="bg-gradient-to-r from-amber-200 to-amber-100 text-amber-900">
                  <th className="px-4 py-2 border-b font-semibold">Name</th>
                  <th className="px-4 py-2 border-b font-semibold">Username</th>
                  <th className="px-4 py-2 border-b font-semibold">Email</th>
                  <th className="px-4 py-2 border-b font-semibold">Contact</th>
                  <th className="px-4 py-2 border-b font-semibold">DOB</th>
                  <th className="px-4 py-2 border-b font-semibold">Role</th>
                  <th className="px-4 py-2 border-b font-semibold">Privilege For Books</th>
                  <th className="px-4 py-2 border-b font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user._id}
                    className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50'} hover:bg-amber-100`}
                    style={{ color: '#222' }}
                  >
                    <td className="px-4 py-2 border-b font-semibold">{user.name}</td>
                    <td className="px-4 py-2 border-b">{user.username}</td>
                    {editUserId === user._id ? (
                      <>
                        <td className="px-4 py-2 border-b">
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={editData.email || ''}
                            onChange={e => handleEditChange('email', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 border-b">
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={editData.contactNo || ''}
                            onChange={e => handleEditChange('contactNo', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 border-b">
                          <input
                            className="border rounded px-2 py-1 w-full"
                            type="date"
                            value={editData.dob ? new Date(editData.dob).toISOString().substring(0, 10) : ''}
                            onChange={e => handleEditChange('dob', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2 border-b">
                          <select
                            className="border rounded px-2 py-1 w-32 min-w-[8rem]"
                            value={editData.role || 'user'}
                            onChange={e => handleEditChange('role', e.target.value)}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="guest">guest</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 border-b">
                          <div className="flex gap-2">
                            {['normal', 'special', 'private'].map(option => (
                              <button
                                key={option}
                                type="button"
                                className={`px-2 py-1 rounded border ${editData.privilegeForBooks?.includes(option) ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}
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
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-b text-center">
                          <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-sm transition-all mr-2" onClick={() => handleEditSave(user._id)}>Save</button>
                          <button className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow-sm transition-all" onClick={handleEditCancel}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 border-b">{user.email}</td>
                        <td className="px-4 py-2 border-b">{user.contactNo}</td>
                        <td className="px-4 py-2 border-b">{user.dob ? new Date(user.dob).toLocaleDateString() : ''}</td>
                        <td className="px-4 py-2 border-b">{user.role}</td>
                        <td className="px-4 py-2 border-b text-center">
                          {Array.isArray(user.privilegeForBooks)
                            ? user.privilegeForBooks.join(', ')
                            : user.privilegeForBooks || 'normal'}
                        </td>
                        <td className="px-4 py-2 border-b text-center">
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
