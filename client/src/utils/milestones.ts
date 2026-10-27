export interface MilestonePreset {
  hours: number;
  label: string;
  isMidterm?: boolean;
  isFinal?: boolean;
}

export interface TargetPresetOption {
  hours: number;
  label: string;
  desc: string;
}

export const TARGET_HOUR_PRESETS: TargetPresetOption[] = [
  { hours: 243, label: '243 hrs', desc: 'CHED 3-Unit' },
  { hours: 300, label: '300 hrs', desc: 'Summer OJT' },
  { hours: 486, label: '486 hrs', desc: 'CHED 6-Unit' },
  { hours: 500, label: '500 hrs', desc: 'Corporate' },
  { hours: 600, label: '600 hrs', desc: 'Engineering' },
];

export function getDynamicMilestones(targetHours: number = 486): MilestonePreset[] {
  const target = Math.max(20, Math.round(targetHours || 486));

  if (target <= 300) {
    const q1 = Math.max(10, Math.round(target * 0.25));
    const mid = Math.max(q1 + 10, Math.round(target * 0.5));
    const q3 = Math.max(mid + 10, Math.round(target * 0.75));

    const set = new Map<number, MilestonePreset>();
    set.set(q1, { hours: q1, label: `${q1}h (25%)` });
    set.set(mid, { hours: mid, label: `${mid}h (Midterm)`, isMidterm: true });
    set.set(q3, { hours: q3, label: `${q3}h (75%)` });
    set.set(target, { hours: target, label: `${target}h (Final)`, isFinal: true });

    return Array.from(set.values()).sort((a, b) => a.hours - b.hours);
  }

  // Target > 300 (e.g. 486, 500, 600)
  const early = target >= 550 ? Math.round(target * 0.25) : 100;
  const mid = Math.round(target * 0.5);
  const q3 = Math.round(target * 0.75);

  const set = new Map<number, MilestonePreset>();
  set.set(early, { hours: early, label: `${early}h` });
  set.set(mid, { hours: mid, label: `${mid}h (Midterm)`, isMidterm: true });
  set.set(q3, { hours: q3, label: `${q3}h (75%)` });
  set.set(target, { hours: target, label: `${target}h (Final)`, isFinal: true });

  return Array.from(set.values()).sort((a, b) => a.hours - b.hours);
}
