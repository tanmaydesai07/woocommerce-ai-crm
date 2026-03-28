import { describe, expect, it } from 'vitest';
import { buildOrderStatusCommunication, mapWooStatusToOrderStatus } from '../../utils/orderWorkflow.js';

describe('mapWooStatusToOrderStatus', () => {
  it('maps known WooCommerce statuses into CRM order statuses', () => {
    expect(mapWooStatusToOrderStatus('processing')).toBe('processing');
    expect(mapWooStatusToOrderStatus('completed')).toBe('delivered');
    expect(mapWooStatusToOrderStatus('on-hold')).toBe('pending');
    expect(mapWooStatusToOrderStatus('refunded')).toBe('cancelled');
  });

  it('falls back to pending for unknown statuses', () => {
    expect(mapWooStatusToOrderStatus('draft')).toBe('pending');
  });
});

describe('buildOrderStatusCommunication', () => {
  it('creates a communication payload on status change', () => {
    const payload = buildOrderStatusCommunication({
      orderNumber: '5001',
      previousStatus: 'pending',
      nextStatus: 'processing',
      now: 1_700_000_000_000
    });

    expect(payload).not.toBeNull();
    expect(payload.type).toBe('note');
    expect(payload.status).toBe('open');
    expect(payload.subject).toContain('#5001');
    expect(payload.followUpDate).toBeInstanceOf(Date);
  });

  it('returns null when status does not change', () => {
    const payload = buildOrderStatusCommunication({
      orderNumber: '5001',
      previousStatus: 'processing',
      nextStatus: 'processing'
    });

    expect(payload).toBeNull();
  });
});
