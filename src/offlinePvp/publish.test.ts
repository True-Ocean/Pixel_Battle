import { describe, expect, it } from 'vitest';
import { isPublishedRemoteIdForOwner } from './publish';

describe('isPublishedRemoteIdForOwner', () => {
  it('accepts matching owner and slot', () => {
    expect(
      isPublishedRemoteIdForOwner(
        { owner_id: 'user-a', slot_index: 2 },
        'user-a',
        2,
      ),
    ).toBe(true);
  });

  it('rejects different owner', () => {
    expect(
      isPublishedRemoteIdForOwner(
        { owner_id: 'user-a', slot_index: 0 },
        'user-b',
        0,
      ),
    ).toBe(false);
  });

  it('rejects different slot', () => {
    expect(
      isPublishedRemoteIdForOwner(
        { owner_id: 'user-a', slot_index: 1 },
        'user-a',
        0,
      ),
    ).toBe(false);
  });

  it('rejects missing row', () => {
    expect(isPublishedRemoteIdForOwner(null, 'user-a', 0)).toBe(false);
  });
});
