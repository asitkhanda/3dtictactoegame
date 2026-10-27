import { describe, expect, it } from 'vitest';
import {
  decideNotification,
  isStaleAfterRefund,
  type NotificationPayload,
  type NotificationTransaction,
} from '../../supabase/functions/_shared/appStoreNotification';

const expected = { bundleId: 'com.twistedtac.TwistedTac', productId: 'com.twistedtac.TwistedTac.largeboards' };
const transaction: NotificationTransaction = {
  originalTransactionId: '2000000123456789',
  bundleId: expected.bundleId,
  productId: expected.productId,
};
const notice = (notificationType: string): NotificationPayload => ({ notificationType, signedDate: 1_800_000_000_000 });

describe('decideNotification', () => {
  it('revokes on a refund, using Apple\'s refund time', () => {
    const decision = decideNotification(notice('REFUND'), { ...transaction, revocationDate: 1_799_000_000_000 }, expected);
    expect(decision).toEqual({
      action: 'revoke',
      originalTransactionId: '2000000123456789',
      revokedAt: 1_799_000_000_000,
    });
  });

  it('falls back to the notification time when the refund time is missing', () => {
    const decision = decideNotification(notice('REFUND'), transaction, expected);
    expect(decision).toMatchObject({ action: 'revoke', revokedAt: 1_800_000_000_000 });
  });

  it('treats a family-sharing revoke like a refund', () => {
    expect(decideNotification(notice('REVOKE'), transaction, expected).action).toBe('revoke');
  });

  it('restores when a refund is reversed', () => {
    expect(decideNotification(notice('REFUND_REVERSED'), transaction, expected)).toEqual({
      action: 'restore',
      originalTransactionId: '2000000123456789',
      signedAt: 1_800_000_000_000,
    });
  });

  it.each(['TEST', 'REFUND_DECLINED', 'CONSUMPTION_REQUEST', 'DID_RENEW', 'ONE_TIME_CHARGE'])(
    'ignores %s',
    (type) => {
      expect(decideNotification(notice(type), transaction, expected).action).toBe('ignore');
    },
  );

  it('ignores a refund for another app or product', () => {
    expect(decideNotification(notice('REFUND'), { ...transaction, bundleId: 'com.other.app' }, expected).action).toBe('ignore');
    expect(decideNotification(notice('REFUND'), { ...transaction, productId: 'com.other.product' }, expected).action).toBe('ignore');
  });

  it('ignores a refund with no transaction attached', () => {
    expect(decideNotification(notice('REFUND'), null, expected).action).toBe('ignore');
  });
});

describe('isStaleAfterRefund', () => {
  const refunded = '2026-10-30T10:00:00.000Z';
  const refundMs = Date.parse(refunded);

  it('allows a purchase that was never refunded', () => {
    expect(isStaleAfterRefund(null, refundMs)).toBe(false);
  });

  it('rejects a receipt from before the refund, which would re-grant a refunded purchase', () => {
    expect(isStaleAfterRefund(refunded, refundMs - 86_400_000)).toBe(true);
    expect(isStaleAfterRefund(refunded, refundMs)).toBe(true);
  });

  it('allows a fresh purchase made after the refund', () => {
    expect(isStaleAfterRefund(refunded, refundMs + 60_000)).toBe(false);
  });
});
