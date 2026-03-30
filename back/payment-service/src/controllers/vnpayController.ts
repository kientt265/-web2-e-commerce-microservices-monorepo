import { Request, Response } from 'express';
import {
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  IpnSuccess,
  IpnUnknownError,
} from 'vnpay';
import { vnpay } from '../services/vnpayService';
import { PaymentService } from '../services/paymentService';

export class VnPayController {
  constructor(private paymentService: PaymentService) {}

  vnpayReturn = async (req: Request, res: Response) => {
    try {
      const verify = vnpay.verifyReturnUrl(req.query);

      if (!verify.isVerified) {
        console.log("Verify successful!");
        return res.status(400).send('VNPay return verification failed');
      }

      // Return URL is primarily for UI feedback. Business logic must be handled via IPN.
      const redirectUrl = process.env.VNPAY_RETURN_REDIRECT_URL;
      if (redirectUrl) return res.redirect(redirectUrl);

      return res.status(200).send(verify.isSuccess ? 'Payment success' : 'Payment failed');
    } catch (error) {
      console.error('VNPay return error:', error);
      return res.status(500).send('VNPay return error');
    }
  };

  // VNPay IPN is server-to-server and typically calls this endpoint with query string params.
  vnpayIpn = async (req: Request, res: Response) => {
    console.log("VNPay IPN called");
    try {
      const params = Object.keys(req.query ?? {}).length ? req.query : req.body;
      const verify = vnpay.verifyIpnCall(params as any);

      if (!verify.isVerified) {
        return res.json(IpnFailChecksum);
      }

      const orderId = String(verify.vnp_TxnRef || '');
      if (!orderId) {
        return res.json(IpnOrderNotFound);
      }

      // If we already have the payment record, validate amount match.
      const existingPayment = await this.paymentService.getPaymentByOrderId(orderId);
      if (existingPayment) {
        const expectedAmount = Number(existingPayment.amount);
        const receivedAmount = typeof verify.vnp_Amount === 'number' ? verify.vnp_Amount : Number(verify.vnp_Amount || 0);
        if (Number.isFinite(expectedAmount) && expectedAmount !== receivedAmount) {
          return res.json(IpnInvalidAmount);
        }
      }

      const amount = typeof verify.vnp_Amount === 'number' ? verify.vnp_Amount : Number(verify.vnp_Amount || 0);
      const transactionId =
        (verify as any).vnp_TransactionNo ?? (verify as any).vnp_TransactionId ?? undefined;

      await this.paymentService.handleGatewayResult({
        orderId,
        isSuccess: !!verify.isSuccess,
        gatewayResponse: verify,
        amount,
        transactionId,
      });

      return res.json(IpnSuccess);
    } catch (error) {
      console.error('VNPay IPN error:', error);
      // If order not found, treat it as order-not-found error.
      const msg = (error as any)?.message || '';
      if (msg.includes('Payment record not found')) {
        return res.json(IpnOrderNotFound);
      }
      return res.json(IpnUnknownError);
    }
  };
}

