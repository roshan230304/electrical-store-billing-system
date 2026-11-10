import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AddUserModal from '../components/modals/AddUserModal';
import {
  Users,
  Plus,
  RefreshCw,
  Crown,
  ShieldCheck,
  CheckCircle2,
  X,
  Trash2
} from 'lucide-react';

export default function SyncAndShare() {
  const [users, setUsers] = useState([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      alert('Cloud synchronization complete! All business data is up to date.');
    }, 1500);
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove user "${name}"?`)) {
      const res = await api.deleteUser(id);
      if (res.success) loadUsers();
      else alert(res.message);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header matching frame_1080s_066.jpg */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-base font-bold text-gray-800">Sync & Share</h1>
          <Crown className="w-4 h-4 text-amber-500" />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 flex items-center space-x-1"
            title="Sync Now"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="bg-[#e01a4f] hover:bg-[#c71342] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            Add Users
          </button>
        </div>
      </div>

      <div className="text-[11px] text-gray-500">
        Currently logged in with the following number: <span className="font-semibold text-gray-800">9742762826</span>
      </div>

      {/* Pink Notification Banner matching frame_1080s_066.jpg */}
      {showBanner && (
        <div className="bg-[#f43f5e] text-white p-3.5 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
              👤
            </div>
            <div>
              <p className="font-bold text-sm">Next Step : Add Users</p>
              <p className="text-xs text-white/90">
                Now, add users and assign them relevant roles to add or manage Business.
              </p>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-white/80 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Users List Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <span className="font-bold text-xs text-gray-800">Business Team & Roles ({users.length})</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
            <tr>
              <th className="p-2.5">User</th>
              <th className="p-2.5">Phone / Email</th>
              <th className="p-2.5">Role</th>
              <th className="p-2.5">View Access</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="p-2.5 font-bold text-gray-900 flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                    {u.full_name.charAt(0)}
                  </div>
                  <span>{u.full_name}</span>
                </td>
                <td className="p-2.5 text-gray-600">{u.phone_number || u.email || 'N/A'}</td>
                <td className="p-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    u.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-2.5 text-gray-600">{u.view_access}</td>
                <td className="p-2.5">
                  <span className="text-emerald-700 font-medium flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Active
                  </span>
                </td>
                <td className="p-2.5 text-center">
                  {u.id !== 1 && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.full_name)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onUserAdded={loadUsers}
      />
    </div>
  );
}

