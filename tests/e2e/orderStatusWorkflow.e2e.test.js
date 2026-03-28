import { describe, expect, it } from 'vitest';
import { buildOrderStatusCommunication } from '../../utils/orderWorkflow.js';

describe('Order Status Workflow E2E', () => {
  it('generates workflow communications across a full lifecycle transition', () => {
    const orderNumber = '9001';
    const transitions = [
      ['pending', 'processing'],
      ['processing', 'shipped'],
      ['shipped', 'delivered']
    ];

    const generated = transitions
      .map(([previousStatus, nextStatus]) =>
        buildOrderStatusCommunication({ orderNumber, previousStatus, nextStatus, now: 1_700_000_000_000 })
      )
      .filter(Boolean);

    expect(generated).toHaveLength(3);
    expect(generated[0].status).toBe('open');
    expect(generated[1].followUpDate).toBeInstanceOf(Date);
    expect(generated[2].status).toBe('resolved');
    expect(generated[2].subject).toContain('delivered');
  });
});
