import type { Config } from '@netlify/functions';
import {
  isUploadId,
  lastSegment,
  manifestKey,
  retentionActionForDay,
} from '../shared/uploadCore';
import { openUploadStore } from '../shared/uploadStore';

type Store = ReturnType<typeof openUploadStore>;

/** Scheduled functions are limited to 30 s; stop early and resume next run. */
const TIME_BUDGET_MS = 25_000;

async function deletePrefix(store: Store, prefix: string, deadline: number): Promise<number> {
  const { blobs } = await store.list({ prefix });
  let deleted = 0;
  for (const blob of blobs) {
    if (Date.now() > deadline) {
      break;
    }
    await store.delete(blob.key);
    deleted += 1;
  }
  return deleted;
}

/**
 * Enforces the retention promised in the privacy notice: completed uploads
 * are deleted after UPLOAD_POLICY.retentionDays, abandoned (never completed)
 * sessions after UPLOAD_POLICY.incompleteRetentionDays.
 */
export default async (): Promise<Response> => {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const store = openUploadStore();
  const today = new Date();
  let deleted = 0;

  const { directories: dayPrefixes } = await store.list({ directories: true });
  for (const dayPrefix of dayPrefixes) {
    if (Date.now() > deadline) break;
    const day = lastSegment(dayPrefix);
    const action = retentionActionForDay(day, today);
    if (action === 'keep') continue;

    if (action === 'delete-all') {
      deleted += await deletePrefix(store, `${day}/`, deadline);
      continue;
    }

    const { directories: sessionPrefixes } = await store.list({ prefix: `${day}/`, directories: true });
    for (const sessionPrefix of sessionPrefixes) {
      if (Date.now() > deadline) break;
      const uid = lastSegment(sessionPrefix);
      if (!isUploadId(uid)) continue;
      const manifest = await store.getMetadata(manifestKey(day, uid));
      if (!manifest) {
        deleted += await deletePrefix(store, `${day}/${uid}/`, deadline);
      }
    }
  }

  console.log(`upload-cleanup: deleted ${deleted} blobs`);
  return new Response(null, { status: 204 });
};

export const config: Config = {
  schedule: '@daily',
};
