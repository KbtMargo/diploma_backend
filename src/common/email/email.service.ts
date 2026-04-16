import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  private baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(99,102,241,0.10);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:36px 48px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;">
              🚀 StartWay
            </div>
            <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:6px;letter-spacing:0.5px;">
              Платформа пошуку роботи та стажувань
            </div>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:40px 48px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 48px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              © 2026 StartWay · Платформа пошуку роботи для молоді
            </p>
            <p style="color:#cbd5e1;font-size:11px;margin:8px 0 0;">
              Цей лист надіслано автоматично, будь ласка не відповідайте на нього
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private button(url: string, text: string, color = '#6366f1'): string {
    return `
      <div style="text-align:center;margin:32px 0;">
        <a href="${url}" style="background:${color};color:#ffffff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.3px;">
          ${text}
        </a>
      </div>`;
  }

  async sendWelcome(email: string, firstName: string): Promise<void> {
    const content = `
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <h1 style="color:#1e1b4b;font-size:26px;font-weight:800;margin:0 0 8px;">
          Ласкаво просимо, ${firstName}!
        </h1>
        <p style="color:#64748b;font-size:15px;margin:0;">
          Ваш акаунт успішно створено на платформі StartWay
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:14px;padding:24px;margin-bottom:24px;">
        <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 16px;">Що ви можете робити:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;">
              <span style="color:#6366f1;font-size:18px;margin-right:12px;">✓</span>
              <span style="color:#374151;font-size:14px;">Переглядати тисячі вакансій та стажувань</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="color:#6366f1;font-size:18px;margin-right:12px;">✓</span>
              <span style="color:#374151;font-size:14px;">Подавати заявки в один клік</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="color:#6366f1;font-size:18px;margin-right:12px;">✓</span>
              <span style="color:#374151;font-size:14px;">Створити професійне резюме та портфоліо</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="color:#6366f1;font-size:18px;margin-right:12px;">✓</span>
              <span style="color:#374151;font-size:14px;">Спілкуватись з роботодавцями напряму</span>
            </td>
          </tr>
        </table>
      </div>

      ${this.button(`${this.configService.get('FRONTEND_URL')}/jobs`, '🔍 Знайти роботу')}
    `;
    await this.send({ to: email, subject: '🎉 Ласкаво просимо на StartWay!', html: this.baseTemplate(content) });
  }

  async sendPasswordReset(email: string, firstName: string, resetUrl: string): Promise<void> {
    const content = `
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">🔐</div>
        <h1 style="color:#1e1b4b;font-size:26px;font-weight:800;margin:0 0 8px;">
          Скидання паролю
        </h1>
        <p style="color:#64748b;font-size:15px;margin:0;">
          Привіт, <strong>${firstName}</strong>! Ми отримали запит на скидання паролю вашого акаунту.
        </p>
      </div>

      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#92400e;font-size:13px;margin:0;">
          ⏰ <strong>Увага:</strong> Посилання дійсне лише <strong>1 годину</strong> з моменту отримання цього листа.
        </p>
      </div>

      ${this.button(resetUrl, '🔑 Скинути пароль')}

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-top:24px;">
        <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center;">
          Якщо ви не запитували скидання паролю — просто проігноруйте цей лист.<br>
          Ваш пароль залишиться без змін.
        </p>
      </div>
    `;
    await this.send({ to: email, subject: '🔐 Скидання паролю — StartWay', html: this.baseTemplate(content) });
  }

  async sendApplicationStatus(
    email: string,
    firstName: string,
    jobTitle: string,
    status: string,
    applicationId: string,
  ): Promise<void> {
    const statusConfig: Record<string, { label: string; emoji: string; color: string }> = {
      reviewed: { label: 'Переглянуто', emoji: '👀', color: '#3b82f6' },
      shortlisted: { label: 'Відібрано', emoji: '⭐', color: '#8b5cf6' },
      interview_scheduled: { label: 'Запрошено на співбесіду', emoji: '📅', color: '#f59e0b' },
      offered: { label: 'Отримано пропозицію', emoji: '🎊', color: '#10b981' },
      rejected: { label: 'Відхилено', emoji: '😔', color: '#ef4444' },
    };

    const s = statusConfig[status] || { label: status, emoji: '📋', color: '#6366f1' };

    const content = `
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">${s.emoji}</div>
        <h1 style="color:#1e1b4b;font-size:26px;font-weight:800;margin:0 0 8px;">
          Статус заявки змінено
        </h1>
        <p style="color:#64748b;font-size:15px;margin:0;">
          Привіт, <strong>${firstName}</strong>!
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:14px;padding:24px;margin-bottom:24px;">
        <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Вакансія</p>
        <p style="color:#1e1b4b;font-size:16px;font-weight:700;margin:0 0 16px;">${jobTitle}</p>
        <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Новий статус</p>
        <span style="background:${s.color}20;color:${s.color};padding:6px 16px;border-radius:20px;font-size:14px;font-weight:600;">
          ${s.emoji} ${s.label}
        </span>
      </div>

      ${this.button(`${this.configService.get('FRONTEND_URL')}/applications`, '📋 Переглянути заявку')}
    `;
    await this.send({ to: email, subject: `${s.emoji} Статус заявки: ${s.label} — ${jobTitle}`, html: this.baseTemplate(content) });
  }

  async sendNewApplication(
    email: string,
    employerName: string,
    jobTitle: string,
    applicantName: string,
    applicationId: string,
  ): Promise<void> {
    const content = `
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">📨</div>
        <h1 style="color:#1e1b4b;font-size:26px;font-weight:800;margin:0 0 8px;">
          Нова заявка!
        </h1>
        <p style="color:#64748b;font-size:15px;margin:0;">
          Привіт, <strong>${employerName}</strong>!
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:14px;padding:24px;margin-bottom:24px;">
        <p style="color:#374151;font-size:15px;margin:0 0 16px;">
          Кандидат <strong style="color:#6366f1;">${applicantName}</strong> подав заявку на вашу вакансію:
        </p>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
          <p style="color:#1e1b4b;font-size:16px;font-weight:700;margin:0;">💼 ${jobTitle}</p>
        </div>
      </div>

      ${this.button(`${this.configService.get('FRONTEND_URL')}/employer/dashboard`, '👀 Переглянути заявку')}
    `;
    await this.send({ to: email, subject: `📨 Нова заявка на "${jobTitle}" — StartWay`, html: this.baseTemplate(content) });
  }

  async sendInterviewScheduled(
    email: string,
    firstName: string,
    jobTitle: string,
    companyName: string,
    interviewDate: Date,
    meetingLink?: string,
  ): Promise<void> {
    const formattedDate = interviewDate.toLocaleString('uk-UA', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const content = `
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">📅</div>
        <h1 style="color:#1e1b4b;font-size:26px;font-weight:800;margin:0 0 8px;">
          Співбесіду заплановано!
        </h1>
        <p style="color:#64748b;font-size:15px;margin:0;">
          Привіт, <strong>${firstName}</strong>! Вас запрошують на співбесіду.
        </p>
      </div>

      <div style="background:#f8fafc;border-radius:14px;padding:24px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
              <span style="color:#94a3b8;font-size:13px;">Вакансія</span><br>
              <span style="color:#1e1b4b;font-weight:600;font-size:15px;">${jobTitle}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
              <span style="color:#94a3b8;font-size:13px;">Компанія</span><br>
              <span style="color:#1e1b4b;font-weight:600;font-size:15px;">${companyName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;">
              <span style="color:#94a3b8;font-size:13px;">Дата і час</span><br>
              <span style="color:#6366f1;font-weight:700;font-size:15px;">📅 ${formattedDate}</span>
            </td>
          </tr>
          ${meetingLink ? `
          <tr>
            <td style="padding:10px 0;border-top:1px solid #e2e8f0;">
              <span style="color:#94a3b8;font-size:13px;">Посилання на зустріч</span><br>
              <a href="${meetingLink}" style="color:#6366f1;font-size:14px;">🔗 ${meetingLink}</a>
            </td>
          </tr>` : ''}
        </table>
      </div>

      ${this.button(meetingLink || `${this.configService.get('FRONTEND_URL')}/applications`, '🎯 Перейти до співбесіди', '#10b981')}

      <div style="background:#ecfdf5;border-radius:12px;padding:16px 20px;margin-top:16px;">
        <p style="color:#065f46;font-size:13px;margin:0;text-align:center;">
          💡 Підготуйтесь заздалегідь — ознайомтесь з компанією та підготуйте питання
        </p>
      </div>
    `;
    await this.send({ to: email, subject: `📅 Співбесіда заплановано: ${jobTitle} — StartWay`, html: this.baseTemplate(content) });
  }

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const result = await this.transporter.sendMail({
        from: `"StartWay" <${this.configService.get('SMTP_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      this.logger.log(`Message ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }
}