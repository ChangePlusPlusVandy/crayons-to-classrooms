import { ActivityDisplay } from './activities';

export const isPalletOperation = (activity: ActivityDisplay) =>
  activity.item_ids != null && activity.item_ids.length > 0;
