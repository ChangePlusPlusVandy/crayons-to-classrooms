import { ActivityDisplay } from './activities';

export const isPalletOperation = (activity: ActivityDisplay) =>
  !activity.product_id &&
  activity.quantity > 1 &&
  (activity.inventory_action === 'MOVE' ||
    activity.inventory_action === 'DONATED' ||
    activity.inventory_action === 'DISCARD');
