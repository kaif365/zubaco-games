import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// Razorpay webhook source IPs (from their documentation)
// https://razorpay.com/docs/webhooks/
const RAZORPAY_WEBHOOK_IPS = [
  '52.66.160.0/20',
  '13.232.0.0/14',
  '3.6.0.0/15',
  '3.108.0.0/14',
];

@Injectable()
export class RazorpayWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.headers['x-forwarded-for']?.split(',')[0]?.trim();

    if (!clientIp) {
      throw new ForbiddenException('Unable to determine client IP');
    }

    // In production, validate IP is from Razorpay ranges
    // In development, allow all IPs for local testing
    if (process.env.NODE_ENV === 'production') {
      const isAllowed = this.isIpInRange(clientIp, RAZORPAY_WEBHOOK_IPS);
      if (!isAllowed) {
        throw new ForbiddenException('Webhook request from unauthorized IP');
      }
    }

    return true;
  }

  private isIpInRange(ip: string, cidrs: string[]): boolean {
    const ipNum = this.ipToNumber(ip);
    if (ipNum === null) return false;

    for (const cidr of cidrs) {
      const [base, bits] = cidr.split('/');
      const baseNum = this.ipToNumber(base);
      if (baseNum === null) continue;

      const mask = ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0;
      if ((ipNum & mask) === (baseNum & mask)) {
        return true;
      }
    }
    return false;
  }

  private ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    return parts.reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0;
  }
}
