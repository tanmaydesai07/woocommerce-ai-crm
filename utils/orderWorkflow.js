export function mapWooStatusToOrderStatus(status) {
  const statusMap = {
    pending: 'pending',
    processing: 'processing',
    'on-hold': 'pending',
    completed: 'delivered',
    cancelled: 'cancelled',
    refunded: 'cancelled',
    failed: 'cancelled'
  };

  return statusMap[status] || 'pending';
}

export function buildOrderStatusCommunication({
  orderNumber,
  previousStatus,
  nextStatus,
  now = Date.now()
}) {
  if (!orderNumber || !previousStatus || !nextStatus || previousStatus === nextStatus) {
    return null;
  }

  const shouldFollowUp = ['pending', 'processing', 'shipped'].includes(nextStatus);

  return {
    type: 'note',
    subject: `Order #${orderNumber} status changed to ${nextStatus}`,
    notes: `Automated workflow: order moved from ${previousStatus} to ${nextStatus}.`,
    followUpDate: shouldFollowUp ? new Date(now + 24 * 60 * 60 * 1000) : null,
    status: nextStatus === 'delivered' ? 'resolved' : 'open'
  };
}
