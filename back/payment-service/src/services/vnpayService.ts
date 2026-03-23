import { VNPay } from 'vnpay';

// VNPay client for server-side verification/building.
// IMPORTANT: This must run only on backend (IPN/Return handling).
export const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE,
  secureSecret: process.env.VNPAY_SECRET_KEY,
  vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn',
  testMode: process.env.VNPAY_TEST_MODE === 'true',
  hashAlgorithm: 'SHA512',
  enableLog: true,
});

