'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/use-auth-store';
import { toast } from 'sonner';

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminsManagementPage() {
  const { admin: currentUser } = useAuthStore();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const response: any = await apiClient.get('/auth');
      if (response.success) {
        setAdmins(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      const response: any = await apiClient.patch(`/auth/verify/${id}`);
      if (response.success) {
        setAdmins(admins.map(a => a._id === id ? { ...a, isVerified: true, role: 'admin' } : a));
        toast.success(response.message || 'Admin verified successfully');
      }
    } catch (error) {
      toast.error('Failed to verify admin');
    }
  };

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="text-center space-y-6">
           <div className="text-6xl mb-6">🔒</div>
           <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">Access <span className="text-red-500">Denied.</span></h2>
           <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-loose max-w-xs mx-auto italic">
              Administrative access management is restricted to Super Admins only.
           </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-reveal">
      <div>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">Staff.</h1>
        <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase italic">Control Access Permissions</p>
      </div>

      <div className="rounded-[40px] border border-white/5 bg-white/[0.01] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Administrator</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Role</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.map((staff) => (
                <tr key={staff._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-neutral-400 text-xl group-hover:text-white transition-colors">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white tracking-tight">{staff.name}</p>
                        <p className="text-[11px] text-neutral-600 font-medium">{staff.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] italic ${
                      staff.role === 'super_admin' ? 'text-blue-500' : 
                      staff.role === 'admin' ? 'text-white' : 'text-neutral-600'
                    }`}>
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      staff.isVerified ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse'
                    }`}>
                      {staff.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-right">
                    {!staff.isVerified && (
                      <button
                        onClick={() => handleVerify(staff._id)}
                        className="h-10 px-6 rounded-xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-black transition-all shadow-lg shadow-blue-600/20"
                      >
                        Verify Staff
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
