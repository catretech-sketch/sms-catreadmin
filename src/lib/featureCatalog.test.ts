import { describe, it, expect } from 'vitest';
import { FEATURE_CATALOG, FEATURE_LABELS, FEATURE_GROUPS, featuresForTier, TIER_META } from './featureCatalog';

describe('featureCatalog', () => {
  it('derives labels and groups from the catalog', () => {
    expect(FEATURE_LABELS['sis.students']).toBe('Students (SIS)');
    expect(TIER_META.gold.rank).toBe(2);
    const academic = FEATURE_GROUPS.find(g => g.title === 'Academic');
    expect(academic?.codes).toContain('attendance');
  });
  it('featuresForTier is cumulative by rank', () => {
    const silver = featuresForTier('silver');
    const platinum = featuresForTier('platinum');
    expect(silver).toContain('sis.students');           // silver module
    expect(silver).not.toContain('hr.payroll');         // platinum module excluded at silver
    expect(platinum).toContain('hr.payroll');            // included at platinum
    expect(platinum.length).toBeGreaterThan(silver.length);
    expect(Object.keys(FEATURE_CATALOG).length).toBe(platinum.length); // platinum unlocks all
  });
});
