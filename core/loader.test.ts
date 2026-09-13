import { describe, expect, it } from 'vitest';
import { loadCampaignJson } from './loader.js';

const validCampaign = JSON.stringify({
  title: 'Weekend Plans',
  backstory: 'A small test campaign.',
  sharedCategories: [{ name: 'People', items: ['Ari', 'Bea'] }],
  puzzles: [
    {
      narration: 'Match each person to a place.',
      puzzle: {
        name: 'Places',
        sharedCategories: ['People'],
        localCategories: [{ name: 'Places', items: ['Park', 'Cafe'] }],
        solution: [
          { People: 'Ari', Places: 'Park' },
          { People: 'Bea', Places: 'Cafe' },
        ],
        options: {
          difficulty: 'easy',
          maxClues: 3,
          allowedClueTypes: ['positive', 'negative'],
        },
      },
    },
  ],
});

describe('loadCampaignJson', () => {
  it('loads a valid campaign and resolves shared categories', () => {
    const campaign = loadCampaignJson(validCampaign);

    expect(campaign.puzzles[0].puzzle.localCategories[0].name).toBe('Places');
    expect(campaign.puzzles[0].puzzle.solution).toHaveLength(2);
  });

  it('rejects unknown shared category references', () => {
    const campaign = JSON.parse(validCampaign);
    campaign.puzzles[0].puzzle.sharedCategories = ['Unknown'];

    expect(() => loadCampaignJson(JSON.stringify(campaign))).toThrow(
      "references unknown category 'Unknown'",
    );
  });

  it('rejects duplicate solution items', () => {
    const campaign = JSON.parse(validCampaign);
    campaign.puzzles[0].puzzle.solution[1].Places = 'Park';

    expect(() => loadCampaignJson(JSON.stringify(campaign))).toThrow(
      "repeats an item in category 'Places'",
    );
  });
});
