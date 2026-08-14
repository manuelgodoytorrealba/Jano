import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PasswordResetMail = { to: string; resetUrl: string; expiresInMinutes: number };
type EmailVerificationMail = { to: string; verificationUrl: string; expiresInHours: number };

@Injectable()
export class MailService {
  private latestTestPasswordReset: PasswordResetMail | null = null;
  private latestTestEmailVerification: EmailVerificationMail | null = null;

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(message: PasswordResetMail): Promise<void> {
    const environment = this.config.getOrThrow<string>('NODE_ENV');
    if (environment === 'test') {
      this.latestTestPasswordReset = message;
      return;
    }

    const provider = this.config.getOrThrow<string>('MAIL_PROVIDER');
    if (provider === 'console') {
      // Development-only transport; never enabled in production by env validation.
      console.info(
        `[mail:development] Password reset requested for ${message.to}: ${message.resetUrl}`,
      );
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.getOrThrow<string>('RESEND_API_KEY')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to: [message.to],
        subject: 'Restablece tu contraseña de JANO',
        text: `Has solicitado restablecer tu contraseña de JANO. Usa este enlace: ${message.resetUrl}\n\nEl enlace expira en ${message.expiresInMinutes} minutos. Si no fuiste tú, puedes ignorar este mensaje.`,
      }),
    });

    if (!response.ok) throw new Error(`Mail delivery failed with status ${response.status}`);
  }

  getLatestTestPasswordReset(): PasswordResetMail | null {
    return this.latestTestPasswordReset;
  }

  async sendEmailVerification(message: EmailVerificationMail): Promise<void> {
    if (this.config.getOrThrow<string>('NODE_ENV') === 'test') {
      this.latestTestEmailVerification = message;
      return;
    }
    if (this.config.getOrThrow<string>('MAIL_PROVIDER') === 'console') {
      console.info(
        `[mail:development] Email verification requested for ${message.to}: ${message.verificationUrl}`,
      );
      return;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.getOrThrow<string>('RESEND_API_KEY')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to: [message.to],
        subject: 'Verifica tu correo de JANO',
        text: `Verifica tu dirección de correo: ${message.verificationUrl}\n\nEste enlace expira en ${message.expiresInHours} horas.`,
      }),
    });
    if (!response.ok) throw new Error(`Mail delivery failed with status ${response.status}`);
  }

  getLatestTestEmailVerification(): EmailVerificationMail | null {
    return this.latestTestEmailVerification;
  }
}
