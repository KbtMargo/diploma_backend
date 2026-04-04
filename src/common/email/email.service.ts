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

  async sendWelcome(email: string, firstName: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Ласкаво просимо на платформу!',
      html: `
        <h2>Привіт, ${firstName}!</h2>
        <p>Дякуємо за реєстрацію на нашій платформі пошуку роботи.</p>
        <p>Тепер ви можете:</p>
        <ul>
          <li>Переглядати вакансії та стажування</li>
          <li>Подавати заявки на роботу</li>
          <li>Створити своє резюме</li>
        </ul>
        <a href="${this.configService.get('FRONTEND_URL')}/jobs" 
           style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
          Переглянути вакансії
        </a>
      `,
    });
  }

  async sendApplicationStatus(
    email: string,
    firstName: string,
    jobTitle: string,
    status: string,
    applicationId: string,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      reviewed: 'переглянуто',
      shortlisted: 'відібрано',
      interview_scheduled: 'запрошено на співбесіду',
      offered: 'отримано пропозицію',
      rejected: 'відхилено',
    };

    await this.send({
      to: email,
      subject: `Статус заявки змінено: ${jobTitle}`,
      html: `
        <h2>Привіт, ${firstName}!</h2>
        <p>Статус вашої заявки на вакансію <strong>${jobTitle}</strong> змінено на: 
           <strong>${statusLabels[status] || status}</strong>
        </p>
        <a href="${this.configService.get('FRONTEND_URL')}/applications/${applicationId}"
           style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
          Переглянути заявку
        </a>
      `,
    });
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

    await this.send({
      to: email,
      subject: `Співбесіда запланована: ${jobTitle}`,
      html: `
        <h2>Привіт, ${firstName}!</h2>
        <p>Вашу співбесіду на вакансію <strong>${jobTitle}</strong> 
           в компанії <strong>${companyName}</strong> заплановано.</p>
        <p><strong>Дата і час:</strong> ${formattedDate}</p>
        ${meetingLink ? `<p><strong>Посилання:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
        <p>Бажаємо успіху!</p>
      `,
    });
  }

  async sendPasswordReset(email: string, firstName: string, resetUrl: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Скидання паролю',
      html: `
        <h2>Привіт, ${firstName}!</h2>
        <p>Ви отримали цей лист, бо запросили скидання паролю.</p>
        <p>Посилання дійсне 1 годину.</p>
        <a href="${resetUrl}"
           style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
          Скинути пароль
        </a>
        <p>Якщо ви не запитували скидання — проігноруйте цей лист.</p>
      `,
    });
  }

  async sendNewApplication(
    email: string,
    employerName: string,
    jobTitle: string,
    applicantName: string,
    applicationId: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: `Нова заявка на вакансію: ${jobTitle}`,
      html: `
        <h2>Привіт, ${employerName}!</h2>
        <p>Користувач <strong>${applicantName}</strong> подав заявку на вашу вакансію 
           <strong>${jobTitle}</strong>.</p>
        <a href="${this.configService.get('FRONTEND_URL')}/employer/applications/${applicationId}"
           style="background:#4F46E5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
          Переглянути заявку
        </a>
      `,
    });
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('SMTP_FROM_NAME', 'Job Platform')}" <${this.configService.get('SMTP_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
    }
  }
}