import type { AnswerOption, SupervisionAnswer } from '../types/sismut';

export interface ScoreSummary {
  totalScore: number;
  compliantCount: number;
  nonCompliantCount: number;
  naCount: number;
  unansweredCount: number;
  applicableCount: number;
  totalItems: number;
  compliantWeight: number;
  applicableWeight: number;
}

/**
 * Calculates supervision quality score strictly following SISMUT rules:
 * 1. N/A answers are NEVER included in the denominator.
 * 2. Unanswered (null) items are NEVER treated as 'Sesuai' (they remain in denominator as non-compliant / unverified if scored, or wait:
 *    Prompt says: "Pastikan indikator yang belum diisi tidak dianggap sebagai indikator sesuai."
 *    And "Nilai = (Jumlah indikator sesuai / Jumlah indikator yang berlaku) x 100%"
 *    When an item is answered 'Sesuai' -> contributes to numerator AND denominator.
 *    When answered 'Tidak Sesuai' -> contributes 0 to numerator, contributes to denominator.
 *    When unanswered (null) -> contributes 0 to numerator, and counts in applicable denominator so incomplete checklists cannot inflate score to 100%!
 *    When answered 'N/A' -> excluded from BOTH numerator and denominator.
 */
export function calculateSupervisionScore(
  answers: Array<Pick<SupervisionAnswer, 'answer' | 'weight_snapshot'>>,
  isWeighted: boolean = true
): ScoreSummary {
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let naCount = 0;
  let unansweredCount = 0;
  let applicableCount = 0;
  let compliantWeight = 0;
  let applicableWeight = 0;

  for (const item of answers) {
    const ans: AnswerOption = item.answer ?? null;
    const weight = Number(item.weight_snapshot) > 0 ? Number(item.weight_snapshot) : 1;

    if (ans === 'N/A') {
      naCount += 1;
      continue;
    }

    applicableCount += 1;
    applicableWeight += isWeighted ? weight : 1;

    if (ans === 'Sesuai') {
      compliantCount += 1;
      compliantWeight += isWeighted ? weight : 1;
    } else if (ans === 'Tidak Sesuai') {
      nonCompliantCount += 1;
    } else {
      unansweredCount += 1;
    }
  }

  const totalScore =
    applicableWeight > 0
      ? Math.round((compliantWeight / applicableWeight) * 10000) / 100
      : 0;

  return {
    totalScore,
    compliantCount,
    nonCompliantCount,
    naCount,
    unansweredCount,
    applicableCount,
    totalItems: answers.length,
    compliantWeight: Math.round(compliantWeight * 100) / 100,
    applicableWeight: Math.round(applicableWeight * 100) / 100,
  };
}

export function formatScorePercent(score: number): string {
  return `${Number(score || 0).toFixed(1)}%`;
}

export function getScorePredicate(score: number, passingScore = 80): {
  label: string;
  tone: 'emerald' | 'blue' | 'amber' | 'red';
} {
  if (score >= 90) return { label: 'Sangat Baik (Paripurna)', tone: 'emerald' };
  if (score >= passingScore) return { label: 'Memenuhi Standar', tone: 'blue' };
  if (score >= 65) return { label: 'Perlu Pembinaan', tone: 'amber' };
  return { label: 'Kritis / Prioritas Perbaikan', tone: 'red' };
}
