import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createSupabaseAuthUser,
  deleteSupabaseAuthUser,
  getSupabaseConfig,
  loadSupabaseDatabase,
  saveSupabaseDatabase,
  uploadToSupabaseBucket,
} from './server/supabaseCloudStore';

const PORT = 3000;

function computeScore(
  answers: Array<{ answer: string | null; weight_snapshot: number }>,
  isWeighted: boolean
) {
  let compliantCount = 0;
  let applicableCount = 0;
  let compliantWeight = 0;
  let applicableWeight = 0;

  for (const a of answers) {
    if (!a.answer || a.answer === 'N/A') continue;
    const w = Number(a.weight_snapshot) > 0 ? Number(a.weight_snapshot) : 1;
    applicableCount += 1;
    applicableWeight += isWeighted ? w : 1;
    if (a.answer === 'Sesuai') {
      compliantCount += 1;
      compliantWeight += isWeighted ? w : 1;
    }
  }

  const totalScore =
    applicableWeight > 0 ? Math.round((compliantWeight / applicableWeight) * 10000) / 100 : 0;

  return { totalScore, compliantCount, applicableCount };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  const server = http.createServer(app);

  // Pre-warm Supabase Cloud Database & provision buckets + 3 officer accounts on startup
  loadSupabaseDatabase()
    .then((db) => {
      console.log(
        `[Supabase Cloud Ready] Connected to ${getSupabaseConfig().url} (${db.profiles.length} accounts active)`
      );
    })
    .catch((err) => {
      console.error('[Supabase Cloud Init Error]:', err.message);
    });

  // Health & Supabase connection status
  app.get('/api/health', async (_req, res) => {
    try {
      const cfg = getSupabaseConfig();
      const db = await loadSupabaseDatabase();
      res.json({
        status: 'ok',
        storage: 'supabase-cloud',
        supabaseUrl: cfg.url,
        accountsCount: db.profiles.length,
        updatedAt: db.updated_at,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
      const user = db.profiles.find((p) => String(p.email).toLowerCase() === cleanEmail);

      if (!user) {
        return res.status(401).json({
          error: `Akun dengan email "${cleanEmail}" tidak ditemukan di database Supabase.`,
        });
      }
      if (!user.is_active) {
        return res.status(403).json({
          error: 'Akun petugas ini berstatus Nonaktif di database Supabase.',
        });
      }

      db.audit_logs.unshift({
        id: crypto.randomUUID(),
        user_id: user.id,
        user_name: user.full_name,
        user_role: user.role,
        action: 'USER_LOGIN',
        table_name: 'profiles',
        record_id: user.id,
        reason: 'Login ke sistem SISMUT via Supabase',
        old_data: null,
        new_data: { email: user.email },
        created_at: new Date().toISOString(),
      });
      await saveSupabaseDatabase(db);

      return res.json({
        user,
        token: `sb-token-${user.id}`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const userId = token.replace(/^sb-token-/, '');
      const db = await loadSupabaseDatabase();
      const user = db.profiles.find((p) => p.id === userId) || null;
      return res.json({ user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Users / Officer Accounts (Supabase Cloud)
  app.get('/api/users', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const unitMap = new Map(db.units.map((u) => [u.id, u.unit_name]));
      const users = db.profiles.map((p) => ({
        ...p,
        unit_name: p.unit_id ? unitMap.get(p.unit_id) || p.unit_name || null : null,
      }));
      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
      if (!cleanEmail || !req.body?.full_name) {
        return res.status(400).json({ error: 'Nama lengkap dan email wajib diisi.' });
      }
      if (db.profiles.some((p) => String(p.email).toLowerCase() === cleanEmail)) {
        return res.status(400).json({ error: 'Email tersebut sudah terdaftar di Supabase.' });
      }

      const unitObj = db.units.find((u) => u.id === req.body.unit_id);
      const newProfile: any = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        full_name: String(req.body.full_name).trim(),
        role: req.body.role || 'KOMITE_MUTU',
        unit_id: req.body.unit_id || null,
        unit_name: unitObj?.unit_name || null,
        position_title: req.body.position_title || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const authUserId = await createSupabaseAuthUser(newProfile, req.body.password);
      if (authUserId) {
        newProfile.auth_user_id = authUserId;
      }

      db.profiles.push(newProfile);
      db.audit_logs.unshift({
        id: crypto.randomUUID(),
        user_id: newProfile.id,
        user_name: newProfile.full_name,
        user_role: newProfile.role,
        action: 'CREATE_USER',
        table_name: 'profiles',
        record_id: newProfile.id,
        reason: 'Penambahan akun pengguna di Supabase',
        old_data: null,
        new_data: newProfile,
        created_at: new Date().toISOString(),
      });

      await saveSupabaseDatabase(db);
      return res.json(newProfile);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.profiles.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan di Supabase.' });
      }

      const existing = db.profiles[idx];
      const nextUnitId =
        req.body.unit_id !== undefined ? req.body.unit_id || null : existing.unit_id;
      const unitObj = db.units.find((u) => u.id === nextUnitId);

      const updated = {
        ...existing,
        ...(req.body.full_name !== undefined ? { full_name: req.body.full_name } : {}),
        ...(req.body.role !== undefined ? { role: req.body.role } : {}),
        unit_id: nextUnitId,
        unit_name: unitObj?.unit_name || null,
        ...(req.body.position_title !== undefined ? { position_title: req.body.position_title } : {}),
        ...(req.body.is_active !== undefined ? { is_active: Boolean(req.body.is_active) } : {}),
      };

      db.profiles[idx] = updated;
      await saveSupabaseDatabase(db);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const target = db.profiles.find((p) => p.id === req.params.id);
      if (!target) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan di Supabase.' });
      }

      db.profiles = db.profiles.filter((p) => p.id !== req.params.id);
      await deleteSupabaseAuthUser(target.email, target.auth_user_id);

      db.audit_logs.unshift({
        id: crypto.randomUUID(),
        user_id: null,
        user_name: 'Super Admin',
        user_role: 'SUPER_ADMIN',
        action: 'DELETE_USER',
        table_name: 'profiles',
        record_id: req.params.id,
        reason: `Menghapus akun ${target.full_name} (${target.email}) dari Supabase`,
        old_data: target,
        new_data: null,
        created_at: new Date().toISOString(),
      });

      await saveSupabaseDatabase(db);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Upload to Supabase Storage Buckets
  app.post('/api/storage/upload', async (req, res) => {
    try {
      const { bucket, fileName, base64Data, contentType } = req.body || {};
      const validBucket =
        bucket === 'followup-evidence' || bucket === 'application-assets'
          ? bucket
          : 'supervision-evidence';

      if (!base64Data) {
        return res.status(400).json({ error: 'Data file kosong.' });
      }

      const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const publicUrl = await uploadToSupabaseBucket(
        validBucket,
        fileName || 'photo.jpg',
        buffer,
        contentType || 'image/jpeg'
      );

      return res.json({ url: publicUrl });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Units
  app.get('/api/units', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.units);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/units', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const newUnit = {
        id: crypto.randomUUID(),
        unit_code: String(req.body.unit_code || '').trim().toUpperCase(),
        unit_name: String(req.body.unit_name || '').trim(),
        category: req.body.category || 'RAWAT JALAN',
        description: req.body.description || '',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      db.units.push(newUnit);
      await saveSupabaseDatabase(db);
      return res.json(newUnit);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/units/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.units.findIndex((u) => u.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Unit tidak ditemukan.' });
      db.units[idx] = { ...db.units[idx], ...req.body };
      await saveSupabaseDatabase(db);
      return res.json(db.units[idx]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Periods
  app.get('/api/periods', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.periods);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/periods', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const newPeriod = {
        id: crypto.randomUUID(),
        period_name: req.body.period_name,
        period_type: req.body.period_type || 'Triwulanan',
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        status: req.body.status || 'Aktif',
      };
      db.periods.unshift(newPeriod);
      await saveSupabaseDatabase(db);
      return res.json(newPeriod);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/periods/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.periods.findIndex((p) => p.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Periode tidak ditemukan.' });
      db.periods[idx] = { ...db.periods[idx], ...req.body };
      await saveSupabaseDatabase(db);
      return res.json(db.periods[idx]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Instruments
  app.get('/api/instruments', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.instruments);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/instruments', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const instId = crypto.randomUUID();
      const categories = (req.body.categories || []).map((cat: any, cIdx: number) => {
        const catId = crypto.randomUUID();
        return {
          id: catId,
          instrument_id: instId,
          category_name: cat.category_name,
          sort_order: cIdx + 1,
          items: (cat.items || []).map((it: any, iIdx: number) => ({
            id: crypto.randomUUID(),
            category_id: catId,
            item_name: it.item_name,
            standard_description: it.standard_description || '',
            weight: Number(it.weight) || 1,
            is_active: true,
            sort_order: iIdx + 1,
          })),
        };
      });

      const newInst = {
        id: instId,
        instrument_name: req.body.instrument_name,
        unit_category: req.body.unit_category,
        version: 1,
        parent_instrument_id: null,
        description: req.body.description || '',
        is_weighted: req.body.is_weighted !== false,
        is_active: true,
        created_at: new Date().toISOString(),
        categories,
      };

      db.instruments.unshift(newInst);
      await saveSupabaseDatabase(db);
      return res.json(newInst);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/instruments/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.instruments.findIndex((i) => i.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Instrumen tidak ditemukan.' });
      db.instruments[idx] = { ...db.instruments[idx], ...req.body };
      await saveSupabaseDatabase(db);
      return res.json(db.instruments[idx]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/instruments/:id/version', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const source = db.instruments.find((i) => i.id === req.params.id);
      if (!source) return res.status(404).json({ error: 'Instrumen tidak ditemukan.' });
      source.is_active = false;

      const newInstId = crypto.randomUUID();
      const clonedCategories = (source.categories || []).map((cat: any) => {
        const newCatId = crypto.randomUUID();
        return {
          ...cat,
          id: newCatId,
          instrument_id: newInstId,
          items: (cat.items || []).map((it: any) => ({
            ...it,
            id: crypto.randomUUID(),
            category_id: newCatId,
          })),
        };
      });

      const nextInst = {
        ...source,
        id: newInstId,
        version: Number(source.version || 1) + 1,
        parent_instrument_id: source.id,
        is_active: true,
        created_at: new Date().toISOString(),
        categories: clonedCategories,
      };
      db.instruments.unshift(nextInst);
      await saveSupabaseDatabase(db);
      return res.json(nextInst);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/instruments/:id/categories', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const inst = db.instruments.find((i) => i.id === req.params.id);
      if (!inst) return res.status(404).json({ error: 'Instrumen tidak ditemukan.' });
      const newCat = {
        id: crypto.randomUUID(),
        instrument_id: inst.id,
        category_name: req.body.category_name,
        sort_order: (inst.categories?.length || 0) + 1,
        items: [],
      };
      inst.categories = [...(inst.categories || []), newCat];
      await saveSupabaseDatabase(db);
      return res.json(newCat);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/categories/:id/items', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      for (const inst of db.instruments) {
        const cat = (inst.categories || []).find((c: any) => c.id === req.params.id);
        if (cat) {
          const newItem = {
            id: crypto.randomUUID(),
            category_id: cat.id,
            item_name: req.body.item_name,
            standard_description: req.body.standard_description || '',
            weight: Number(req.body.weight) || 1,
            is_active: true,
            sort_order: (cat.items?.length || 0) + 1,
          };
          cat.items = [...(cat.items || []), newItem];
          await saveSupabaseDatabase(db);
          return res.json(newItem);
        }
      }
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/items/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      for (const inst of db.instruments) {
        for (const cat of inst.categories || []) {
          const idx = (cat.items || []).findIndex((it: any) => it.id === req.params.id);
          if (idx !== -1) {
            cat.items[idx] = { ...cat.items[idx], ...req.body };
            await saveSupabaseDatabase(db);
            return res.json(cat.items[idx]);
          }
        }
      }
      return res.status(404).json({ error: 'Indikator tidak ditemukan.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/items/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      for (const inst of db.instruments) {
        for (const cat of inst.categories || []) {
          const before = (cat.items || []).length;
          cat.items = (cat.items || []).filter((it: any) => it.id !== req.params.id);
          if (cat.items.length !== before) {
            await saveSupabaseDatabase(db);
            return res.json({ ok: true });
          }
        }
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Schedules
  app.get('/api/schedules', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.schedules || []);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/schedules', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const unit = db.units.find((u) => u.id === req.body.unit_id);
      const period = db.periods.find((p) => p.id === req.body.period_id);
      const inst = db.instruments.find((i) => i.id === req.body.instrument_id);
      const sup = db.profiles.find((p) => p.id === req.body.supervisor_id);

      const sched = {
        id: crypto.randomUUID(),
        ...req.body,
        unit_name: unit?.unit_name || '',
        unit_category: unit?.category || '',
        period_name: period?.period_name || '',
        instrument_name: inst?.instrument_name || '',
        supervisor_name: sup?.full_name || '',
        status: 'Terjadwal',
        created_at: new Date().toISOString(),
      };
      db.schedules.push(sched);
      await saveSupabaseDatabase(db);
      return res.json(sched);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/schedules/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.schedules.findIndex((s) => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      db.schedules[idx] = { ...db.schedules[idx], ...req.body };
      await saveSupabaseDatabase(db);
      return res.json(db.schedules[idx]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Supervisions
  app.get('/api/supervisions', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.supervisions);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/supervisions/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const sup = db.supervisions.find((s) => s.id === req.params.id);
      if (!sup) return res.status(404).json({ error: 'Data supervisi tidak ditemukan.' });
      const inst = db.instruments.find((i) => i.id === sup.instrument_id);
      const answers = db.supervision_answers[sup.id] || [];
      return res.json({
        ...sup,
        is_weighted: Boolean(inst?.is_weighted ?? true),
        answers,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/supervisions', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const payload = req.body || {};
      const unit = db.units.find((u) => u.id === payload.unit_id);
      const period = db.periods.find((p) => p.id === payload.period_id) || db.periods[0];
      const inst = db.instruments.find((i) => i.id === payload.instrument_id) || db.instruments[0];
      const answerList = Array.isArray(payload.answers) ? payload.answers : [];
      const scoreInfo = computeScore(answerList, Boolean(inst?.is_weighted ?? true));

      const dateStr = payload.supervision_date || new Date().toISOString();
      const ym = dateStr.slice(0, 7).replace('-', '');
      const supId = crypto.randomUUID();
      const supNumber = `SUP-${ym}-${String(Math.floor(100 + Math.random() * 900))}`;
      const nextStatus = payload.status === 'Final' ? 'Final' : payload.status || 'Sedang Diperiksa';

      const created = {
        id: supId,
        supervision_number: supNumber,
        schedule_id: payload.schedule_id || null,
        unit_id: payload.unit_id,
        unit_name: unit?.unit_name || '',
        unit_category: unit?.category || '',
        period_id: period?.id || payload.period_id,
        period_name: period?.period_name || '',
        instrument_id: inst?.id || payload.instrument_id,
        instrument_name: inst?.instrument_name || '',
        instrument_version: inst?.version || 1,
        supervisor_id: db.profiles[1]?.id || db.profiles[0]?.id || null,
        supervisor_name: payload.team_members || db.profiles[1]?.full_name || 'Tim Komite Mutu',
        team_members: payload.team_members || db.profiles[1]?.full_name || 'Tim Komite Mutu',
        supervision_date: dateStr,
        status: nextStatus,
        total_score: scoreInfo.totalScore,
        compliant_count: scoreInfo.compliantCount,
        applicable_count: scoreInfo.applicableCount,
        notes: payload.notes || '',
        finalized_at: nextStatus === 'Final' ? new Date().toISOString() : null,
        finalized_by: nextStatus === 'Final' ? db.profiles[0]?.id || null : null,
        created_at: new Date().toISOString(),
      };

      db.supervisions.unshift(created);
      db.supervision_answers[supId] = answerList.map((a: any) => ({
        id: crypto.randomUUID(),
        supervision_id: supId,
        instrument_item_id: a.instrument_item_id,
        item_name_snapshot: a.item_name_snapshot,
        category_name_snapshot: a.category_name_snapshot,
        weight_snapshot: Number(a.weight_snapshot) || 1,
        answer: a.answer || null,
        notes: a.notes || '',
        supporting_evidence: a.supporting_evidence || '',
        evidence_url: a.evidence_url || '',
        recommendation: a.recommendation || '',
      }));

      if (nextStatus === 'Final' || payload.generate_findings) {
        for (const a of answerList) {
          if (a.answer !== 'Tidak Sesuai') continue;
          const riskLevel = a.risk_level || 'Sedang';
          const slaDays =
            riskLevel === 'Kritis' ? 2 : riskLevel === 'Tinggi' ? 7 : riskLevel === 'Sedang' ? 14 : 30;
          const dueDate = new Date(Date.now() + slaDays * 86400000).toISOString().slice(0, 10);
          db.findings.unshift({
            id: crypto.randomUUID(),
            finding_number: `TM-${ym}-${String(Math.floor(100 + Math.random() * 900))}`,
            supervision_id: supId,
            supervision_number: supNumber,
            unit_id: created.unit_id,
            unit_name: created.unit_name,
            unit_category: created.unit_category,
            instrument_item_id: a.instrument_item_id,
            item_name: a.item_name_snapshot,
            category_name: a.category_name_snapshot || 'Umum',
            description: a.notes || `Ketidaksesuaian pada indikator: ${a.item_name_snapshot}`,
            evidence_url: a.evidence_url || '',
            risk_level: riskLevel,
            recommendation:
              a.recommendation || 'Segera lakukan perbaikan sesuai standar operasional prosedur.',
            pic_id: db.profiles[1]?.id || null,
            pic_name: db.profiles[1]?.full_name || 'Komite Mutu',
            due_date: dueDate,
            status: 'Belum Ditindaklanjuti',
            created_at: new Date().toISOString(),
          });
        }
      }

      await saveSupabaseDatabase(db);
      return res.json(created);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/supervisions/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.supervisions.findIndex((s) => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Data supervisi tidak ditemukan.' });

      const existing = db.supervisions[idx];
      const payload = req.body || {};
      const inst = db.instruments.find((i) => i.id === existing.instrument_id);
      const answerList = Array.isArray(payload.answers)
        ? payload.answers
        : db.supervision_answers[existing.id] || [];
      const scoreInfo = computeScore(answerList, Boolean(inst?.is_weighted ?? true));
      const nextStatus = payload.status || existing.status;

      const updated = {
        ...existing,
        supervision_date: payload.supervision_date ?? existing.supervision_date,
        team_members: payload.team_members ?? existing.team_members,
        status: nextStatus,
        total_score: scoreInfo.totalScore,
        compliant_count: scoreInfo.compliantCount,
        applicable_count: scoreInfo.applicableCount,
        notes: payload.notes ?? existing.notes,
        finalized_at: nextStatus === 'Final' ? new Date().toISOString() : null,
      };

      db.supervisions[idx] = updated;
      if (Array.isArray(payload.answers)) {
        db.supervision_answers[existing.id] = answerList.map((a: any) => ({
          id: a.id || crypto.randomUUID(),
          supervision_id: existing.id,
          instrument_item_id: a.instrument_item_id,
          item_name_snapshot: a.item_name_snapshot,
          category_name_snapshot: a.category_name_snapshot,
          weight_snapshot: Number(a.weight_snapshot) || 1,
          answer: a.answer || null,
          notes: a.notes || '',
          supporting_evidence: a.supporting_evidence || '',
          evidence_url: a.evidence_url || '',
          recommendation: a.recommendation || '',
        }));
      }

      if (nextStatus === 'Final' || payload.generate_findings) {
        const existingSet = new Set(
          db.findings
            .filter((f) => f.supervision_id === existing.id)
            .map((f) => f.instrument_item_id)
        );
        const ym = new Date().toISOString().slice(0, 7).replace('-', '');
        for (const a of answerList) {
          if (a.answer !== 'Tidak Sesuai' || existingSet.has(a.instrument_item_id)) continue;
          const riskLevel = a.risk_level || 'Sedang';
          const slaDays =
            riskLevel === 'Kritis' ? 2 : riskLevel === 'Tinggi' ? 7 : riskLevel === 'Sedang' ? 14 : 30;
          const dueDate = new Date(Date.now() + slaDays * 86400000).toISOString().slice(0, 10);
          db.findings.unshift({
            id: crypto.randomUUID(),
            finding_number: `TM-${ym}-${String(Math.floor(100 + Math.random() * 900))}`,
            supervision_id: existing.id,
            supervision_number: existing.supervision_number,
            unit_id: existing.unit_id,
            unit_name: existing.unit_name,
            unit_category: existing.unit_category,
            instrument_item_id: a.instrument_item_id,
            item_name: a.item_name_snapshot,
            category_name: a.category_name_snapshot || 'Umum',
            description: a.notes || `Ketidaksesuaian pada indikator: ${a.item_name_snapshot}`,
            evidence_url: a.evidence_url || '',
            risk_level: riskLevel,
            recommendation:
              a.recommendation || 'Segera lakukan perbaikan sesuai standar operasional prosedur.',
            pic_id: db.profiles[1]?.id || null,
            pic_name: db.profiles[1]?.full_name || 'Komite Mutu',
            due_date: dueDate,
            status: 'Belum Ditindaklanjuti',
            created_at: new Date().toISOString(),
          });
        }
      }

      await saveSupabaseDatabase(db);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/supervisions/:id/reopen', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.supervisions.findIndex((s) => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Supervisi tidak ditemukan.' });
      db.supervisions[idx].status = 'Sedang Diperiksa';
      db.supervisions[idx].finalized_at = null;
      await saveSupabaseDatabase(db);
      return res.json(db.supervisions[idx]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Findings & Follow-ups
  app.get('/api/findings', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const enriched = db.findings.map((f) => {
        const latestFollowUp =
          db.follow_ups
            .filter((fu) => fu.finding_id === f.id)
            .sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')))[0] ||
          null;
        const verifications = db.verification_logs.filter((v) => v.finding_id === f.id);
        return {
          ...f,
          latest_follow_up: latestFollowUp,
          verifications,
        };
      });
      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/findings', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const payload = req.body || {};
      const unit = db.units.find((u) => u.id === payload.unit_id);
      const sup = db.supervisions.find((s) => s.id === payload.supervision_id);
      const ym = new Date().toISOString().slice(0, 7).replace('-', '');
      const created = {
        id: crypto.randomUUID(),
        finding_number: `TM-${ym}-${String(Math.floor(100 + Math.random() * 900))}`,
        supervision_id: payload.supervision_id,
        supervision_number: sup?.supervision_number || '',
        unit_id: payload.unit_id,
        unit_name: unit?.unit_name || '',
        unit_category: unit?.category || '',
        instrument_item_id: payload.instrument_item_id || null,
        item_name: payload.item_name || payload.category_name || 'Temuan Lapangan',
        category_name: payload.category_name || 'Umum',
        description: payload.description || '',
        evidence_url: payload.evidence_url || '',
        risk_level: payload.risk_level || 'Sedang',
        recommendation: payload.recommendation || '',
        pic_id: payload.pic_id || db.profiles[1]?.id || null,
        pic_name: db.profiles[1]?.full_name || 'Komite Mutu',
        due_date: payload.due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: 'Belum Ditindaklanjuti',
        created_at: new Date().toISOString(),
      };
      db.findings.unshift(created);
      await saveSupabaseDatabase(db);
      return res.json(created);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/findings/:id', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const idx = db.findings.findIndex((f) => f.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Temuan tidak ditemukan.' });
      db.findings[idx] = { ...db.findings[idx], ...req.body };
      await saveSupabaseDatabase(db);
      return res.json(db.findings[idx]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/follow-ups', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const payload = req.body || {};
      const fuStatus = payload.mark_completed
        ? 'Disetujui'
        : payload.submit_for_verification
          ? 'Menunggu Verifikasi'
          : 'Dalam Proses';
      const findingStatus = payload.mark_completed
        ? 'Selesai'
        : payload.submit_for_verification
          ? 'Menunggu Verifikasi'
          : 'Dalam Proses';

      const existingIdx = db.follow_ups.findIndex((fu) => fu.finding_id === payload.finding_id);
      const fuRecord = {
        id: existingIdx !== -1 ? db.follow_ups[existingIdx].id : crypto.randomUUID(),
        finding_id: payload.finding_id,
        root_cause: payload.root_cause || '',
        corrective_action: payload.corrective_action || '',
        preventive_action: payload.preventive_action || '',
        responsible_person: payload.responsible_person || '',
        resources_needed: payload.resources_needed || '',
        target_date: payload.target_date || null,
        execution_date: payload.execution_date || null,
        evidence_url:
          payload.evidence_url ||
          (existingIdx !== -1 ? db.follow_ups[existingIdx].evidence_url : ''),
        status: fuStatus,
        submitted_by: db.profiles[1]?.id || null,
        submitted_by_name: payload.responsible_person || db.profiles[1]?.full_name || 'Komite Mutu',
        submitted_at: new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        db.follow_ups[existingIdx] = fuRecord;
      } else {
        db.follow_ups.unshift(fuRecord);
      }

      const fIdx = db.findings.findIndex((f) => f.id === payload.finding_id);
      if (fIdx !== -1) {
        db.findings[fIdx].status = findingStatus;
      }

      await saveSupabaseDatabase(db);
      return res.json(fuRecord);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/verifications', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const payload = req.body || {};
      const nextFuStatus = payload.verification_result === 'Disetujui' ? 'Disetujui' : 'Dikembalikan';
      const nextFindingStatus =
        payload.verification_result === 'Disetujui' ? 'Selesai' : 'Perlu Perbaikan Ulang';

      db.verification_logs.unshift({
        id: crypto.randomUUID(),
        follow_up_id: payload.follow_up_id,
        finding_id: payload.finding_id,
        verifier_id: db.profiles[1]?.id || null,
        verifier_name: db.profiles[1]?.full_name || 'Komite Mutu',
        verification_result: payload.verification_result,
        verification_notes: payload.verification_notes || '',
        verified_at: new Date().toISOString(),
      });

      const fuIdx = db.follow_ups.findIndex((fu) => fu.id === payload.follow_up_id);
      if (fuIdx !== -1) db.follow_ups[fuIdx].status = nextFuStatus;

      const fIdx = db.findings.findIndex((f) => f.id === payload.finding_id);
      if (fIdx !== -1) db.findings[fIdx].status = nextFindingStatus;

      await saveSupabaseDatabase(db);
      return res.json({ ok: true, status: nextFindingStatus });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Notifications, Audit Logs, Settings
  app.get('/api/notifications', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.notifications || []);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      const n = db.notifications.find((x) => x.id === req.params.id);
      if (n) n.is_read = true;
      await saveSupabaseDatabase(db);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/read-all', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      db.notifications.forEach((n) => {
        n.is_read = true;
      });
      await saveSupabaseDatabase(db);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/audit-logs', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.audit_logs || []);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/settings', async (_req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      return res.json(db.settings);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/settings', async (req, res) => {
    try {
      const db = await loadSupabaseDatabase();
      db.settings = {
        ...db.settings,
        ...req.body,
        updated_at: new Date().toISOString(),
      };
      await saveSupabaseDatabase(db);
      return res.json(db.settings);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SISMUT RSUD Al-Mulk (100% Supabase Cloud Storage) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
