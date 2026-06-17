import { ActivityDisplay } from './activities';

export const isPalletOperation = (activity: ActivityDisplay) =>
  activity.movement_scope != null
    ? activity.movement_scope === 'pallet'
    : activity.item_ids != null && activity.item_ids.length > 1;
