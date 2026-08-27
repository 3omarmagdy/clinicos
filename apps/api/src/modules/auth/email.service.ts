import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

type EmailResponse = { ok: boolean; status: number; text(): Promise<string> };

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');

  async sendTransactional(input: SendEmailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new ServiceUnavailableException('Email delivery is not configured');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
    }) as unknown as EmailResponse;

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`Transactional email failed with status ${response.status}: ${errorBody.slice(0, 300)}`);
      throw new ServiceUnavailableException('Email delivery failed');
    }
  }
}
