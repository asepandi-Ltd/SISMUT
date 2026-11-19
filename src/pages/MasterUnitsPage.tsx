import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Archive, RotateCcw, Search } from 'lucide-react';
import { api } from '../services/api';
import { UNIT_CATEGORIES } from '../lib/permissions';
import { useRealtime } from '../contexts/RealtimeContext';
import type { Unit, UnitCategory } from '../types/sismut';

export function MasterUnitsPage() {
  const { revision } = useRealtime();
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{
    unit_code: string;
    unit_name: string;
    category: UnitCategory;
    description: string;
  }>({
    unit_code: '',
    unit_name: '',
    category: 'RAWAT JALAN',
    description: '',
  });

  const loadUnits = useCallback(async () => {
    try {
      const data = await api.getUnits();
      setUnits(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat unit.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits, revision]);

  const openCreate = () => {
    setEditingUnit(null);
    setForm({ unit_code: '', unit_name: '', category: 'RAWAT JALAN', description: '' });
    setModalOpen(true);
  };

  const openEdit = (u: Unit) => {
    setEditingUnit(u);
    setForm({
      unit_code: u.unit_code,
      unit_name: u.unit_name,
      category: u.category,
      description: u.description,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUnit) {
        await api.updateUnit(editingUnit.id, form);
      } else {
        await api.createUnit(form);
      }
      setModalOpen(false);
      await loadUnits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan unit.');
    }
  };

  const toggleActive = async (u: Unit) => {
    await api.updateUnit(u.id, { is_active: !u.is_active });
    await loadUnits();
  };

  const filtered = units.filter((u) => {
    if (!showArchived && !u.is_active) return false;
    if (categoryFilter !== 'ALL' && u.category !== categoryFilter) return false;
    if (
      search &&
      !u.unit_name.toLowerCase().includes(search.toLowerCase()) &&
      !u.unit_code.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau nama unit..."
              className="rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-[#245A78] focus:outline-none w-56"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-[#243447] focus:border-[#245A78] focus:outline-none"
          >
            <option value="ALL">Semua Kelompok Unit</option>
            {UNIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Tampilkan unit diarsipkan</span>
          </label>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245A78] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Unit Baru</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/5 px-4 py-3 text-xs text-[#D9534F]">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Nama Unit Pelayanan / Penunjang</th>
                <th className="py-3 px-4">Kelompok Unit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Memuat data unit...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Tidak ada unit yang sesuai kriteria.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-semibold text-[#142D42]">{u.unit_code}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#243447]">{u.unit_name}</p>
                      {u.description && <p className="text-[11px] text-slate-500">{u.description}</p>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.category}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          u.is_active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {u.is_active ? 'Aktif' : 'Diarsipkan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#245A78] hover:underline mr-3 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(u)}
                        className={`inline-flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer ${
                          u.is_active ? 'text-[#B87A14]' : 'text-[#238C89]'
                        }`}
                      >
                        {u.is_active ? (
                          <>
                            <Archive className="w-3.5 h-3.5" />
                            <span>Arsipkan</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Aktifkan</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42] mb-4">
              {editingUnit ? 'Edit Master Unit' : 'Tambah Unit Baru'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kode Unit</label>
                <input
                  type="text"
                  required
                  value={form.unit_code}
                  onChange={(e) => setForm((f) => ({ ...f, unit_code: e.target.value }))}
                  placeholder="Misal: RI-04"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#245A78] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Unit</label>
                <input
                  type="text"
                  required
                  value={form.unit_name}
                  onChange={(e) => setForm((f) => ({ ...f, unit_name: e.target.value }))}
                  placeholder="Misal: Ruang Perinatologi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#245A78] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kelompok Unit</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as UnitCategory }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#245A78] focus:outline-none"
                >
                  {UNIT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#245A78] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
