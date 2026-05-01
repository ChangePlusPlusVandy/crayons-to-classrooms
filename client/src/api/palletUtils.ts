import { ActivityDisplay } from './activities';

export const isPalletOperation = (activity: ActivityDisplay) =>
  (activity.item_ids != null && activity.item_ids.length > 0) ||
  (!activity.product_id &&
    activity.quantity > 1 &&
    (activity.inventory_action === 'MOVE' ||
      activity.inventory_action === 'DONATED' ||
      activity.inventory_action === 'DISCARD'));
