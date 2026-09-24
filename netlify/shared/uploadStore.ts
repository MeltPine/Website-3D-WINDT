import { getStore } from '@netlify/blobs';
import { UPLOAD_STORE_NAME, UPLOAD_STORE_REGION } from './uploadCore';

/**
 * Site-wide store for customer CAD uploads. The region is passed explicitly on
 * every open: site-wide stores otherwise default to us-east-2, regardless of
 * the functions region (see Netlify Blobs docs, "Regions"). Strong
 * consistency is required because completion checks read right after writes.
 */
export function openUploadStore() {
  return getStore({ name: UPLOAD_STORE_NAME, region: UPLOAD_STORE_REGION, consistency: 'strong' });
}
