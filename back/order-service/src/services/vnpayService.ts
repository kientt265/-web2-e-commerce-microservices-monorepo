import { VNPay, ProductCode, VnpLocale, dateFormat } from 'vnpay';

export interface VNPayConfig {
  tmnCode: string;
  secretKey: string;
  returnUrl: string;
  version: string;
  command: string;
  currCode: string;
  locale: string;
  bankCode?: string;
}

export interface VNPayPaymentUrlRequest {
  orderId: string;
  amount: number;
  orderInfo: string;
  ipAddress: string;
  bankCode?: string;
}

export class VNPayService {
  private vnpay: VNPay;
  
  constructor() {
    this.vnpay = new VNPay({
      tmnCode: process.env.VNPAY_TMN_CODE || '9M0NUTQ8',
      secureSecret: process.env.VNPAY_SECRET_KEY || '8C6G4NDWKF4O20TSFQ4S6Z5ADA1KIOEJ',
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: process.env.VNPAY_TEST_MODE === 'true',
      hashAlgorithm: 'SHA512',
      enableLog: true,
    });
  }

  createPaymentUrl(request: VNPayPaymentUrlRequest): string {
    // const paymentUrl = this.vnpay.buildPaymentUrl({
    //   vnp_TxnRef: request.orderId,
    //   vnp_OrderInfo: request.orderInfo,
    //   // vnp_Amount in VNPay is in VND; vnpay.js will handle scaling.
    //   vnp_Amount: request.amount,
    //   vnp_IpAddr: request.ipAddress,
    //   vnp_BankCode: request.bankCode,
    //   vnp_OrderType: ProductCode.Other,
    //   vnp_Locale: VnpLocale.VN,
    //   vnp_ReturnUrl:
    //     process.env.VNPAY_RETURN_URL ||
    //     'http://localhost:3008/api/payments/vnpay-return',
    // });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const paymentUrl = this.vnpay.buildPaymentUrl({
      vnp_Amount: 10000,
      vnp_IpAddr: '13.160.92.202',
      vnp_TxnRef: '113372',
      vnp_OrderInfo: 'Thanh toan don hang 123456',
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: 'http://localhost:3003/api/payments/vnpay-return',
      vnp_Locale: VnpLocale.VN, // 'vn' hoặc 'en'
      vnp_CreateDate: dateFormat(new Date()), // tùy chọn, mặc định là thời gian hiện tại
      vnp_ExpireDate: dateFormat(tomorrow), // tùy chọn
  });

    return paymentUrl;
  }

  verifyCallback(queryParams: any): { isValid: boolean; orderId: string; responseCode: string; amount: number } {
    const verify = this.vnpay.verifyReturnUrl(queryParams);

    return {
      isValid: verify.isVerified,
      orderId: verify.vnp_TxnRef || '',
      responseCode: verify.vnp_ResponseCode || '',
      // verify.vnp_Amount is already calculated by the library (unit: VND).
      amount: Number(verify.vnp_Amount || 0),
    };
  }
}
