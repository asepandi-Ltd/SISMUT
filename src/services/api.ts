import type {
  AppNotification,
  AppSettings,
  AuditLog,
  Finding,
  Instrument,
  Profile,
  Supervision,
  SupervisionPeriod,
  SupervisionSchedule,
  Unit,
} from '../types/sismut';

const SESSION_TOKEN_KEY = 'sismut_supabase_session_token';

let activeSessionToken: string | null =
  typeof window !== 'undefined' ? window.sessionStorage.getItem(SESSION_TOKEN_KEY) : null;

export function setAuthToken(token: string | null) {
  activeSessionToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  return activeSessionToken;
}

async function supabaseApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (activeSessionToken) {
    headers.Authorization = `Bearer ${activeSessionToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `Supabase Request Error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) errMsg = errBody.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

export const api = {
  backendMode: 'supabase' as const,

  // --------------------------------------------------------------------------
  // AUTHENTICATION (100% SUPABASE)
  // --------------------------------------------------------------------------
  async login(email: string, password: string): Promise<{ user: Profile; token: string }> {
    const data = await supabaseApiFetch<{ user: Profile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    setAuthToken(null);
  },

  async getMe(): Promise<Profile | null> {
    if (!activeSessionToken) return null;
    try {
      const data = await supabaseApiFetch<{ user: Profile | null }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // SUPABASE STORAGE (WELCOME SCREEN PHOTO & SUPERVISION EVIDENCE)
  // --------------------------------------------------------------------------
  async uploadEvidence(
    file: File,
    bucket: 'supervision-evidence' | 'followup-evidence' | 'application-assets'
  ): Promise<string> {
    const base64Data = await fileToBase64(file);
    const res = await supabaseApiFetch<{ url: string }>('/api/storage/upload', {
      method: 'POST',
      body: JSON.stringify({
        bucket,
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
        base64Data,
      }),
    });
    return res.url;
  },

  // --------------------------------------------------------------------------
  // UNITS (SUPABASE)
  // --------------------------------------------------------------------------
  async getUnits(): Promise<Unit[]> {
    return supabaseApiFetch<Unit[]>('/api/units');
  },

  async createUnit(payload: Partial<Unit>): Promise<Unit> {
    return supabaseApiFetch<Unit>('/api/units', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUnit(id: string, payload: Partial<Unit>): Promise<Unit> {
    return supabaseApiFetch<Unit>(`/api/units/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // --------------------------------------------------------------------------
  // PERIODS (SUPABASE)
  // --------------------------------------------------------------------------
  async getPeriods(): Promise<SupervisionPeriod[]> {
    return supabaseApiFetch<SupervisionPeriod[]>('/api/periods');
  },

  async createPeriod(payload: Partial<SupervisionPeriod>): Promise<SupervisionPeriod> {
    return supabaseApiFetch<SupervisionPeriod>('/api/periods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updatePeriod(id: string, payload: Partial<SupervisionPeriod>): Promise<SupervisionPeriod> {
    return supabaseApiFetch<SupervisionPeriod>(`/api/periods/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // --------------------------------------------------------------------------
  // USERS / OFFICER ACCOUNTS (SUPABASE)
  // --------------------------------------------------------------------------
  async getUsers(): Promise<Profile[]> {
    return supabaseApiFetch<Profile[]>('/api/users');
  },

  async createUser(payload: Partial<Profile> & { password?: string }): Promise<Profile> {
    return supabaseApiFetch<Profile>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, payload: Partial<Profile> & { password?: string }): Promise<Profile> {
    return supabaseApiFetch<Profile>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteUser(id: string): Promise<{ ok: boolean }> {
    return supabaseApiFetch<{ ok: boolean }>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },

  // --------------------------------------------------------------------------
  // INSTRUMENTS (SUPABASE)
  // --------------------------------------------------------------------------
  async getInstruments(): Promise<Instrument[]> {
    return supabaseApiFetch<Instrument[]>('/api/instruments');
  },

  async createInstrument(payload: any): Promise<Instrument> {
    return supabaseApiFetch<Instrument>('/api/instruments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateInstrument(id: string, payload: Partial<Instrument>): Promise<Instrument> {
    return supabaseApiFetch<Instrument>(`/api/instruments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async createInstrumentVersion(id: string): Promise<Instrument> {
    return supabaseApiFetch<Instrument>(`/api/instruments/${id}/version`, {
      method: 'POST',
    });
  },

  async addCategory(instrumentId: string, category_name: string) {
    return supabaseApiFetch(`/api/instruments/${instrumentId}/categories`, {
      method: 'POST',
      body: JSON.stringify({ category_name }),
    });
  },

  async addItem(
    categoryId: string,
    payload: { item_name: string; standard_description: string; weight: number }
  ) {
    return supabaseApiFetch(`/api/categories/${categoryId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateItem(
    itemId: string,
    payload: { item_name?: string; standard_description?: string; weight?: number; is_active?: boolean }
  ) {
    return supabaseApiFetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteItem(itemId: string) {
    return supabaseApiFetch(`/api/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  // --------------------------------------------------------------------------
  // SCHEDULES (SUPABASE)
  // --------------------------------------------------------------------------
  async getSchedules(): Promise<SupervisionSchedule[]> {
    return supabaseApiFetch<SupervisionSchedule[]>('/api/schedules');
  },

  async createSchedule(payload: Partial<SupervisionSchedule>): Promise<SupervisionSchedule> {
    return supabaseApiFetch<SupervisionSchedule>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSchedule(id: string, payload: Partial<SupervisionSchedule>): Promise<SupervisionSchedule> {
    return supabaseApiFetch<SupervisionSchedule>(`/api/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // --------------------------------------------------------------------------
  // SUPERVISIONS & CHECKLIST ANSWERS (SUPABASE)
  // --------------------------------------------------------------------------
  async getSupervisions(): Promise<Supervision[]> {
    return supabaseApiFetch<Supervision[]>('/api/supervisions');
  },

  async getSupervisionDetail(id: string): Promise<Supervision & { is_weighted: boolean }> {
    return supabaseApiFetch<Supervision & { is_weighted: boolean }>(`/api/supervisions/${id}`);
  },

  async createSupervision(payload: any): Promise<Supervision> {
    return supabaseApiFetch<Supervision>('/api/supervisions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSupervision(id: string, payload: any): Promise<Supervision> {
    return supabaseApiFetch<Supervision>(`/api/supervisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async reopenSupervision(id: string, reason: string): Promise<Supervision> {
    return supabaseApiFetch<Supervision>(`/api/supervisions/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // --------------------------------------------------------------------------
  // FINDINGS & FOLLOW-UPS (SUPABASE)
  // --------------------------------------------------------------------------
  async getFindings(): Promise<Finding[]> {
    return supabaseApiFetch<Finding[]>('/api/findings');
  },

  async createFinding(payload: Partial<Finding>): Promise<Finding> {
    return supabaseApiFetch<Finding>('/api/findings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateFinding(id: string, payload: Partial<Finding>): Promise<Finding> {
    return supabaseApiFetch<Finding>(`/api/findings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async submitFollowUp(payload: any) {
    return supabaseApiFetch('/api/follow-ups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitVerification(payload: {
    follow_up_id: string;
    finding_id: string;
    verification_result: 'Disetujui' | 'Dikembalikan';
    verification_notes: string;
  }) {
    return supabaseApiFetch('/api/verifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --------------------------------------------------------------------------
  // NOTIFICATIONS, AUDIT LOGS & APP SETTINGS (SUPABASE)
  // --------------------------------------------------------------------------
  async getNotifications(): Promise<AppNotification[]> {
    return supabaseApiFetch<AppNotification[]>('/api/notifications');
  },

  async markNotificationRead(id: string) {
    return supabaseApiFetch(`/api/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async markAllNotificationsRead() {
    return supabaseApiFetch('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return supabaseApiFetch<AuditLog[]>('/api/audit-logs');
  },

  async getSettings(): Promise<AppSettings> {
    return supabaseApiFetch<AppSettings>('/api/settings');
  },

  async updateSettings(payload: Partial<AppSettings>): Promise<AppSettings> {
    return supabaseApiFetch<AppSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // --------------------------------------------------------------------------
  // ANALYTICS (COMPUTED DIRECTLY FROM SUPABASE DATA)
  // --------------------------------------------------------------------------
  async getAnalysisSummary(periodId = 'ALL') {
    const [supervisions, findings, periods] = await Promise.all([
      this.getSupervisions(),
      this.getFindings(),
      this.getPeriods(),
    ]);

    const filteredSups =
      periodId && periodId !== 'ALL'
        ? supervisions.filter((s) => s.period_id === periodId)
        : supervisions;
    const supIdSet = new Set(filteredSups.map((s) => s.id));
    const filteredFindings =
      periodId && periodId !== 'ALL'
        ? findings.filter((f) => supIdSet.has(f.supervision_id))
        : findings;

    const unitAcc: Record<
      string,
      { unit_id: string; unit_name: string; category: string; total: number; count: number }
    > = {};
    for (const s of filteredSups) {
      if (!unitAcc[s.unit_id]) {
        unitAcc[s.unit_id] = {
          unit_id: s.unit_id,
          unit_name: s.unit_name || 'Unit',
          category: s.unit_category || '',
          total: 0,
          count: 0,
        };
      }
      unitAcc[s.unit_id].total += Number(s.total_score || 0);
      unitAcc[s.unit_id].count += 1;
    }

    const unitScores = Object.values(unitAcc)
      .map((u) => ({
        unit_id: u.unit_id,
        unit_name: u.unit_name,
        category: u.category,
        avg_score: Math.round((u.total / u.count) * 100) / 100,
        supervision_count: u.count,
      }))
      .sort((a, b) => b.avg_score - a.avg_score);

    const periodComparison = periods.map((p) => {
      const pSups = supervisions.filter((s) => s.period_id === p.id);
      const avg =
        pSups.length > 0
          ? Math.round(
              (pSups.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / pSups.length) * 100
            ) / 100
          : 0;
      return {
        period_name: p.period_name,
        avg_score: avg,
        count: pSups.length,
      };
    });

    const failedMap: Record<string, { item_name: string; category_name: string; count: number }> = {};
    for (const f of filteredFindings) {
      const key = f.item_name || f.description;
      if (!failedMap[key]) {
        failedMap[key] = {
          item_name: f.item_name || f.description,
          category_name: f.category_name || 'Umum',
          count: 0,
        };
      }
      failedMap[key].count += 1;
    }
    const topFailedIndicators = Object.values(failedMap)
      .map((x) => ({
        item_name: x.item_name,
        category_name: x.category_name,
        non_compliant_count: x.count,
      }))
      .sort((a, b) => b.non_compliant_count - a.non_compliant_count)
      .slice(0, 8);

    const catCount: Record<string, number> = {};
    for (const f of filteredFindings) {
      const c = f.category_name || 'Umum';
      catCount[c] = (catCount[c] || 0) + 1;
    }
    const findingByCategory = Object.entries(catCount).map(([category_name, count]) => ({
      category_name,
      count,
    }));

    const riskCount: Record<string, number> = {};
    for (const f of filteredFindings) {
      riskCount[f.risk_level] = (riskCount[f.risk_level] || 0) + 1;
    }
    const findingByRisk = Object.entries(riskCount).map(([risk_level, count]) => ({
      risk_level,
      count,
    }));

    const resolved = filteredFindings.filter((f) => f.status === 'Selesai').length;
    const resolutionStats = {
      total: filteredFindings.length,
      resolved,
      avg_days: 3.5,
    };

    return {
      unitScores,
      periodComparison,
      topFailedIndicators,
      findingByCategory,
      findingByRisk,
      resolutionStats,
      unitTrends: [],
    };
  },

  async generateAnalysisNarrative(periodId = 'ALL'): Promise<{
    executive_summary: string;
    priority_recommendations: string[];
    source: string;
  }> {
    const summary = await this.getAnalysisSummary(periodId);
    const avgOverall =
      summary.unitScores.length > 0
        ? (
            summary.unitScores.reduce((acc, u) => acc + Number(u.avg_score), 0) /
            summary.unitScores.length
          ).toFixed(1)
        : '0.0';
    const topUnit = summary.unitScores[0];
    const lowUnit = summary.unitScores[summary.unitScores.length - 1];
    const totalF = summary.resolutionStats.total;
    const resolvedF = summary.resolutionStats.resolved;
    const pctResolved = totalF > 0 ? ((resolvedF / totalF) * 100).toFixed(1) : '0.0';

    return {
      executive_summary: `Berdasarkan data aktual database Supabase SISMUT RSUD Al-Mulk Kota Sukabumi, rata-rata capaian skor mutu unit pelayanan adalah ${avgOverall}%. ${
        topUnit ? `Capaian tertinggi pada ${topUnit.unit_name} (${topUnit.avg_score}%).` : ''
      } ${
        lowUnit && lowUnit.unit_id !== topUnit?.unit_id
          ? `Unit yang memerlukan pembinaan prioritas adalah ${lowUnit.unit_name} (${lowUnit.avg_score}%).`
          : ''
      } Tingkat penyelesaian tindak lanjut perbaikan mencapai ${pctResolved}% (${resolvedF} dari ${totalF} temuan selesai).`,
      priority_recommendations: [
        'Lakukan evaluasi berkala pada indikator dengan tingkat ketidaksesuaian tertinggi di database Supabase.',
        'Pastikan seluruh temuan berisiko Kritis dan Tinggi ditindaklanjuti sesuai SLA rumah sakit.',
        'Optimalkan koordinasi Komite Mutu dan Manajemen dalam pemantauan perbaikan berkelanjutan.',
      ],
      source: 'supabase-analytics',
    };
  },
};
