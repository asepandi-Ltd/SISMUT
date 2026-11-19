import React, { useEffect, useState, useCallback } from 'react';
import { Plus, GitBranch, Trash2, Power, FolderPlus } from 'lucide-react';
import { api } from '../services/api';
import { UNIT_CATEGORIES } from '../lib/permissions';
import { useRealtime } from '../contexts/RealtimeContext';
import type { Instrument, InstrumentItem } from '../types/sismut';

export function InstrumentsPage() {
  const { revision } = useRealtime();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Create instrument modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newInst, setNewInst] = useState({
    instrument_name: '',
    unit_category: 'RAWAT JALAN',
    description: '',
    is_weighted: true,
    initial_category: 'Kepatuhan terhadap SOP',
  });

  // Add category & item inline forms
  const [newCatName, setNewCatName] = useState('');
  const [addingItemCatId, setAddingItemCatId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ item_name: '', standard_description: '', weight: '1.5' });

  const loadInstruments = useCallback(async () => {
    try {
      const data = await api.getInstruments();
      setInstruments(data);
      setSelectedId((prev) => prev || data[0]?.id || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments, revision]);

  const selected = instruments.find((i) => i.id === selectedId) || null;

  const handleCreateInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const created = await api.createInstrument({
        instrument_name: newInst.instrument_name,
        unit_category: newInst.unit_category,
        description: newInst.description,
        is_weighted: newInst.is_weighted,
        categories: newInst.initial_category
          ? [{ category_name: newInst.initial_category, items: [] }]
          : [],
      });
      setCreateOpen(false);
      setNewInst({
        instrument_name: '',
        unit_category: 'RAWAT JALAN',
        description: '',
        is_weighted: true,
        initial_category: 'Kepatuhan terhadap SOP',
      });
      setSelectedId(created.id);
      await loadInstruments();
      setMessage('Instrumen supervisi baru berhasil dibuat.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat instrumen.');
    }
  };

  const handleNewVersion = async (inst: Instrument) => {
    setError('');
    const created = await api.createInstrumentVersion(inst.id);
    setSelectedId(created.id);
    await loadInstruments();
    setMessage(`Versi baru (v${created.version}) berhasil diterbitkan. Riwayat lama tetap terlindungi.`);
  };

  const handleToggleInstActive = async (inst: Instrument) => {
    await api.updateInstrument(inst.id, { is_active: !inst.is_active });
    await loadInstruments();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newCatName.trim()) return;
    await api.addCategory(selected.id, newCatName.trim());
    setNewCatName('');
    await loadInstruments();
  };

  const handleAddItem = async (e: React.FormEvent, catId: string) => {
    e.preventDefault();
    if (!newItem.item_name.trim()) return;
    await api.addItem(catId, {
      item_name: newItem.item_name.trim(),
      standard_description: newItem.standard_description.trim(),
      weight: Number(newItem.weight) || 1,
    });
    setAddingItemCatId(null);
    setNewItem({ item_name: '', standard_description: '', weight: '1.5' });
    await loadInstruments();
  };

  const handleToggleItem = async (it: InstrumentItem) => {
    await api.updateItem(it.id, { is_active: !it.is_active });
    await loadInstruments();
  };

  const handleDeleteItem = async (it: InstrumentItem) => {
    setError('');
    try {
      await api.deleteItem(it.id);
      await loadInstruments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus indikator.');
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <div className="rounded-lg border border-[#238C89]/30 bg-[#E5F3EF] px-4 py-2.5 text-xs font-medium text-[#142D42] flex justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/5 px-4 py-2.5 text-xs text-[#D9534F]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Instrument List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#142D42]">Daftar Instrumen</h2>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#142D42] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#245A78] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Instrumen</span>
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Memuat instrumen...</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {instruments.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => setSelectedId(inst.id)}
                  className={`w-full text-left py-3 px-3 -mx-1 rounded-lg transition-colors cursor-pointer ${
                    selected?.id === inst.id ? 'bg-[#E5F3EF]/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#142D42]">{inst.instrument_name}</span>
                    <span className="font-mono text-[11px] font-semibold text-[#238C89] shrink-0">
                      v{inst.version}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {inst.unit_category} · {inst.is_weighted ? 'Berbobot' : 'Tanpa Bobot'} ·{' '}
                    <span className={inst.is_active ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                      {inst.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Instrument Builder Detail */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
          {!selected ? (
            <p className="text-xs text-slate-500 py-12 text-center">
              Pilih salah satu instrumen di sebelah kiri untuk mengelola kategori dan indikator.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{selected.unit_category}</span>
                    <span>·</span>
                    <span className="font-mono font-semibold text-[#238C89]">Versi {selected.version}</span>
                    <span>·</span>
                    <span>Digunakan {selected.usage_count || 0}x</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#142D42] mt-1">
                    {selected.instrument_name}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">{selected.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNewVersion(selected)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#245A78] px-3 py-1.5 text-xs font-semibold text-[#245A78] hover:bg-[#245A78]/5 cursor-pointer"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Buat Versi v{selected.version + 1}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleInstActive(selected)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{selected.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                  </button>
                </div>
              </div>

              {/* Add Category Form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Tambah kategori pemeriksaan baru (misal: K3RS & Keselamatan Kerja)..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-[#245A78] focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#245A78] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142D42] cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Tambah Kategori</span>
                </button>
              </form>

              {/* Categories and Indicators */}
              <div className="space-y-5">
                {(selected.categories || []).map((cat, idx) => (
                  <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-display text-xs font-bold text-[#142D42]">
                        {idx + 1}. {cat.category_name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setAddingItemCatId(addingItemCatId === cat.id ? null : cat.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#238C89] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Indikator</span>
                      </button>
                    </div>

                    {addingItemCatId === cat.id && (
                      <form
                        onSubmit={(e) => handleAddItem(e, cat.id)}
                        className="p-4 bg-[#E5F3EF]/30 border-b border-slate-200 space-y-2.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <input
                            type="text"
                            required
                            value={newItem.item_name}
                            onChange={(e) => setNewItem((v) => ({ ...v, item_name: e.target.value }))}
                            placeholder="Nama indikator pemeriksaan"
                            className="sm:col-span-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            required
                            value={newItem.weight}
                            onChange={(e) => setNewItem((v) => ({ ...v, weight: e.target.value }))}
                            placeholder="Bobot"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newItem.standard_description}
                            onChange={(e) =>
                              setNewItem((v) => ({ ...v, standard_description: e.target.value }))
                            }
                            placeholder="Kriteria / standar penilaian..."
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                          >
                            Simpan
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="divide-y divide-slate-100">
                      {(cat.items || []).length === 0 ? (
                        <p className="p-4 text-xs text-slate-400">Belum ada indikator pada kategori ini.</p>
                      ) : (
                        (cat.items || []).map((it) => (
                          <div
                            key={it.id}
                            className={`px-4 py-3 flex flex-wrap items-start justify-between gap-3 ${
                              !it.is_active ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-[220px]">
                              <p className="text-xs font-semibold text-[#243447]">{it.item_name}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{it.standard_description}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-xs">
                              <span className="font-mono font-semibold text-[#245A78] tabular-nums">
                                Bobot {it.weight}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleItem(it)}
                                className="text-slate-600 hover:text-[#142D42] underline cursor-pointer"
                              >
                                {it.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(it)}
                                className="text-[#D9534F] hover:text-red-700 cursor-pointer"
                                title="Hapus indikator (hanya jika belum digunakan)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Instrument Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-base font-bold text-[#142D42] mb-4">
              Buat Instrumen Supervisi Baru
            </h3>
            <form onSubmit={handleCreateInstrument} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Instrumen</label>
                <input
                  type="text"
                  required
                  value={newInst.instrument_name}
                  onChange={(e) => setNewInst((v) => ({ ...v, instrument_name: e.target.value }))}
                  placeholder="Misal: Instrumen Supervisi Poliklinik Rawat Jalan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kelompok Unit</label>
                <select
                  value={newInst.unit_category}
                  onChange={(e) => setNewInst((v) => ({ ...v, unit_category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                >
                  {UNIT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kategori Awal</label>
                <input
                  type="text"
                  value={newInst.initial_category}
                  onChange={(e) => setNewInst((v) => ({ ...v, initial_category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={newInst.description}
                  onChange={(e) => setNewInst((v) => ({ ...v, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newInst.is_weighted}
                  onChange={(e) => setNewInst((v) => ({ ...v, is_weighted: e.target.checked }))}
                />
                <span>Gunakan perhitungan skor berbobot</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#142D42] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Buat Instrumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
