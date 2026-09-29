import type { Config } from '@netlify/functions';
import { handleVerifyPaymentLink } from '../shared/verifyLink';

export default (request: Request): Response =>
  handleVerifyPaymentLink(request, {
    env: process.env,
    nowSeconds: () => Math.floor(Date.now() / 1000),
  });

export const config: Config = {
  path: '/api/payment-link',
  method: 'GET',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
