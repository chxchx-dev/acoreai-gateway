import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private from = 'AlanIA <no-reply@alania.local>';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from = this.config.get<string>('SMTP_FROM') ?? this.from;

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP no configurado (SMTP_HOST/SMTP_USER/SMTP_PASS): los correos se registrarán en el log en vez de enviarse.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<number>('SMTP_PORT', 587) === 465,
      auth: { user, pass },
    });
  }

  async sendPasswordResetCode(to: string, code: string, ttlMinutes: number): Promise<void> {
    const subject = 'Recupera tu contraseña de AlanIA';
    const text = `Tu código para restablecer la contraseña es: ${code}\n\nEste código vence en ${ttlMinutes} minutos. Si no solicitaste este cambio, ignora este correo.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1E7C77;">Recupera tu contraseña</h2>
        <p>Usa el siguiente código en la app de AlanIA para crear una nueva contraseña:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1E7C77;">${code}</p>
        <p>Este código vence en ${ttlMinutes} minutos.</p>
        <p style="color: #666;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `SMTP no configurado: código de recuperación para ${to} = ${code} (no enviado por correo)`,
      );
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
  }
}
