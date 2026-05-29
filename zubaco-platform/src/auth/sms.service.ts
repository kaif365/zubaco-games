import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: 'msg91' | 'twilio';
  private readonly apiKey: string;

  constructor() {
    this.provider = (config.sms?.provider as any) || 'msg91';
    this.apiKey = config.sms?.apiKey || '';
  }

  async send(phone: string, message: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('SMS API key not configured, skipping send');
      return false;
    }

    try {
      if (this.provider === 'msg91') {
        return this.sendViaMSG91(phone, message);
      } else {
        return this.sendViaTwilio(phone, message);
      }
    } catch (err) {
      this.logger.error(`SMS send failed: ${(err as Error).message}`);
      return false;
    }
  }

  private async sendViaMSG91(phone: string, message: string): Promise<boolean> {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: this.apiKey,
      },
      body: JSON.stringify({
        template_id: config.sms?.templateId,
        short_url: '0',
        recipients: [{ mobiles: phone, otp: message.match(/\d{4,6}/)?.[0] || message }],
      }),
    });

    const data = await response.json();
    return data.type === 'success';
  }

  private async sendViaTwilio(phone: string, message: string): Promise<boolean> {
    const accountSid = config.sms?.twilioSid || '';
    const authToken = config.sms?.twilioToken || '';
    const fromNumber = config.sms?.twilioFrom || '';

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({ To: phone, From: fromNumber, Body: message }).toString(),
      },
    );

    const data = await response.json();
    return !!data.sid;
  }
}
