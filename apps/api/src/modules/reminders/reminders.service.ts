import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

type AppointmentForReminder = {
  id: string;
  organizationId: string;
  scheduledAt: Date;
  patientId: string;
  patient: { firstName: string; lastName: string; email: string | null };
  service: { name: string } | null;
};

@Injectable()
export class RemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RemindersService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.config.get<string>('REMINDER_WORKER_ENABLED') !== 'true') return;
    this.timer = setInterval(() => void this.run(), 60_000);
    void this.run();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  isValidWorkerSecret(secret?: string) {
    const configured = this.config.get<string>('REMINDER_WORKER_SECRET');
    return Boolean(configured && secret && secret === configured);
  }

  async list(organizationId: string) {
    return this.prisma.appointmentReminder.findMany({
      where: { organizationId },
      include: { patient: { select: { firstName: true, lastName: true, email: true } }, appointment: { select: { scheduledAt: true, status: true, service: { select: { name: true } } } } },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
  }

  async run() {
    const scheduled = await this.scheduleUpcoming();
    const sent = await this.processDue();
    return { scheduled, sent, ranAt: new Date().toISOString() };
  }

  private reminderHours() {
    const value = Number(this.config.get<string>('REMINDER_HOURS_BEFORE') ?? 24);
    return Number.isFinite(value) && value > 0 && value <= 168 ? value : 24;
  }

  private async scheduleUpcoming() {
    const now = new Date();
    const target = new Date(now.getTime() + this.reminderHours() * 60 * 60_000);
    const appointments = await this.prisma.appointment.findMany({
      where: { status: { in: ['scheduled', 'confirmed'] }, scheduledAt: { gte: now, lte: new Date(target.getTime() + 10 * 60_000) }, patient: { email: { not: null } } },
      include: { patient: { select: { firstName: true, lastName: true, email: true } }, service: { select: { name: true } } },
    }) as AppointmentForReminder[];
    let created = 0;
    for (const appointment of appointments) {
      const scheduledAt = new Date(appointment.scheduledAt.getTime() - this.reminderHours() * 60 * 60_000);
      try {
        await this.prisma.appointmentReminder.create({ data: { organizationId: appointment.organizationId, appointmentId: appointment.id, patientId: appointment.patientId, channel: 'email', scheduledAt } });
        created++;
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')) throw error;
      }
    }
    return created;
  }

  private async processDue() {
    const due = await this.prisma.appointmentReminder.findMany({ where: { channel: 'email', status: 'pending', scheduledAt: { lte: new Date() } }, include: { appointment: { include: { service: true } }, patient: true }, take: 50, orderBy: { scheduledAt: 'asc' } });
    let sent = 0;
    for (const reminder of due) {
      if (!['scheduled', 'confirmed'].includes(reminder.appointment.status) || !reminder.patient.email) {
        await this.prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: 'skipped', error: 'المريض لا يملك بريدًا أو تم إلغاء الموعد' } });
        continue;
      }
      try {
        const providerId = await this.sendEmail(reminder.patient.email, reminder.patient.firstName, reminder.appointment.scheduledAt, reminder.appointment.service?.name);
        await this.prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: 'sent', sentAt: new Date(), providerId, error: null } });
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'Email provider error';
        await this.prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: 'failed', error: message } });
        this.logger.warn(`Reminder ${reminder.id} failed: ${message}`);
      }
    }
    return sent;
  }

  private async sendEmail(to: string, firstName: string, scheduledAt: Date, serviceName?: string | null) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
    const from = this.config.get<string>('REMINDER_FROM_EMAIL') ?? 'ClinicOS <onboarding@resend.dev>';
    const locale = this.config.get<string>('REMINDER_LOCALE') ?? 'ar-EG';
    const date = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(scheduledAt);
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject: 'تذكير بموعدك في العيادة', html: `<div dir="rtl"><p>مرحبًا ${this.escape(firstName)}،</p><p>هذا تذكير بموعدك${serviceName ? ` لدى ${this.escape(serviceName)}` : ''} يوم <strong>${this.escape(date)}</strong>.</p><p>إذا احتجت إلى تغيير الموعد، يرجى التواصل مع العيادة.</p></div>` }) });
    const body = await response.json() as { id?: string; message?: string };
    if (!response.ok || !body.id) throw new Error(body.message ?? `Email provider failed (${response.status})`);
    return body.id;
  }

  private escape(value: string) { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character)); }
}
