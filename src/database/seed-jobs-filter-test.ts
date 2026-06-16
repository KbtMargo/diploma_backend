import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Job, JobType, JobStatus, ExperienceLevel, WorkFormat } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { Company, CompanyStatus, CompanySize } from '../companies/entities/company.entity';
import { Application, ApplicationStatus } from '../applications/entities/application.entity';
import { Skill } from '../skills/entities/skill.entity';
import { SkillCategory } from '../skills/entities/skill-category.entity';
import { SavedJob } from '../jobs/entities/saved-job.entity';
import { CompanyReview } from '../companies/entities/company-review.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuditLog } from '../admin/entities/audit-log.entity';
import { Message } from '../chat/entities/message.entity';

const DB = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Strong_New_Password_123!',
  database: process.env.DB_DATABASE || 'youth_job_platform',
  entities: [
    User, Company, CompanyReview, Job, SavedJob, Application,
    Skill, SkillCategory, Notification, RefreshToken, AuditLog, Message,
  ],
  synchronize: false,
});

async function main() {
  await DB.initialize();
  console.log('✅ DB connected');

  const userRepo = DB.getRepository(User);
  const jobRepo  = DB.getRepository(Job);

  const employers = await userRepo.find({
    where: [
      { email: 'employer@itsolutions.ua' },
      { email: 'employer@startuphub.ua' },
      { email: 'employer@globaldev.ua' },
    ],
  });

  if (employers.length === 0) {
    console.error('❌ No employers found. Run the main seed first.');
    process.exit(1);
  }

  const emp = (i: number) => employers[i % employers.length];

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 3);

  // 10 вакансій, кожна максимально відрізняється від інших.
  // Покриття:
  //   category       — всі 10 категорій
  //   jobType        — всі 6 типів (full_time, part_time, internship, freelance, contract, remote)
  //   workFormat     — всі 3 формати (office, remote, hybrid)
  //   experienceLevel — всі 6 рівнів (intern, junior, middle, senior, lead, executive)
  //   language       — всі 6 мов (ukrainian, english, polish, german, french, spanish)
  //   isPaid         — 2 unpaid, 8 paid
  //   salary         — від нуля до $400k

  const JOBS = [
    // 1 ─ IT · full_time · office · intern · Ukrainian only · no salary · unpaid
    {
      title: 'IT-стажист (підтримка користувачів)',
      description: 'Громадська організація "Молодь у дії" шукає IT-стажиста для підтримки внутрішніх користувачів та адміністрування офісної техніки. Позиція без оплати — чудова можливість отримати перший досвід в IT.',
      requirements: 'Базові знання Windows та MS Office. Бажання навчатися. Вміння пояснювати технічні речі простою мовою.',
      responsibilities: 'Налаштування комп\'ютерів та принтерів. Допомога співробітникам з технічними питаннями. Ведення обліку обладнання.',
      benefits: 'Рекомендаційний лист. Досвід у реальному IT-середовищі. Гнучкий графік (20 год/тиж). Можливість переходу на оплачувану посаду.',
      jobType: JobType.FULL_TIME,
      experienceLevel: ExperienceLevel.INTERN,
      workFormat: WorkFormat.OFFICE,
      country: 'Ukraine',
      city: 'Kyiv',
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      stipendAmount: null,
      isPaid: false,
      category: 'it',
      requiredLanguages: ['ukrainian'],
      tags: ['it-support', 'internship', 'volunteer', 'unpaid'],
      employerIdx: 0,
    },

    // 2 ─ Design · part_time · remote · junior · Polish + English · paid (PLN)
    {
      title: 'Графічний дизайнер (часткова зайнятість)',
      description: 'Краківська маркетингова студія шукає Part-Time Graphic Designer для роботи над рекламними матеріалами та брендингом клієнтів зі Скандинавії та Польщі. 20 годин на тиждень, повністю дистанційно.',
      requirements: '1+ рік досвіду в графічному дизайні. Знання Adobe Illustrator та Photoshop. Портфоліо з 5+ проєктів. Польська B2+, англійська B1+.',
      responsibilities: 'Розробка банерів, листівок та соціальних матеріалів. Підтримка брендбуків клієнтів. Участь у командних дзвінках двічі на тиждень.',
      benefits: 'Гнучкий графік. Повністю дистанційна робота. Ставка за годину + бонуси. Молода творча команда.',
      jobType: JobType.PART_TIME,
      experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.REMOTE,
      country: 'Poland',
      city: 'Kraków',
      salaryMin: 3500,
      salaryMax: 5000,
      salaryCurrency: 'PLN',
      stipendAmount: null,
      isPaid: true,
      category: 'design',
      requiredLanguages: ['polish', 'english'],
      tags: ['graphic-design', 'part-time', 'remote', 'branding'],
      employerIdx: 1,
    },

    // 3 ─ Marketing · internship · hybrid · intern · German + English · paid stipend (EUR)
    {
      title: 'Marketing Intern (Praktikum)',
      description: 'Hamburgська FMCG-компанія пропонує оплачуване стажування у відділі маркетингу. Ви отримаєте реальний досвід у digital-маркетингу: від SMM до аналізу кампаній.',
      requirements: 'Навчання на бакалавраті або магістратурі за спеціальністю маркетинг / комунікації. Німецька B2+, англійська B1+. Впевнене користування соціальними мережами.',
      responsibilities: 'Підготовка контенту для Instagram і LinkedIn. Аналіз ефективності кампаній у Google Analytics. Підтримка senior-менеджерів у підготовці презентацій.',
      benefits: 'Оплата стажування 800 EUR/міс. Офіс 3 дні на тиждень (гібрид). Менторство від CMO. Можливість постійного найму.',
      jobType: JobType.INTERNSHIP,
      experienceLevel: ExperienceLevel.INTERN,
      workFormat: WorkFormat.HYBRID,
      country: 'Germany',
      city: 'Hamburg',
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: 'EUR',
      stipendAmount: 800,
      isPaid: true,
      category: 'marketing',
      requiredLanguages: ['german', 'english'],
      tags: ['marketing', 'internship', 'smm', 'germany'],
      employerIdx: 2,
    },

    // 4 ─ Finance · freelance · remote · senior · English + German · very high salary (CHF)
    {
      title: 'Freelance Financial Modelling Consultant',
      description: 'Цюрихська boutique M&A-фірма шукає фрілансера-фінансового аналітика для підтримки транзакцій клієнтів у середньому та великому бізнесі. Проєктна робота 3-6 міс, повністю дистанційно з рідкими поїздками до Цюриха.',
      requirements: '7+ років у фінансовому моделюванні або M&A. CFA або MBA перевага. Досконале знання Excel і PowerPoint. Англійська C1, німецька B2+.',
      responsibilities: 'Побудова LBO, DCF та comparable analysis моделей. Підготовка інвестиційних меморандумів. Супровід due diligence. Спілкування з клієнтами рівня C-suite.',
      benefits: 'Проєктна ставка 1 500–2 000 CHF/день. Гнучкий графік. Повністю дистанційна робота. Престижний портфель клієнтів.',
      jobType: JobType.FREELANCE,
      experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.REMOTE,
      country: 'Switzerland',
      city: 'Zurich',
      salaryMin: 150000,
      salaryMax: 200000,
      salaryCurrency: 'CHF',
      stipendAmount: null,
      isPaid: true,
      category: 'finance',
      requiredLanguages: ['english', 'german'],
      tags: ['freelance', 'finance', 'ma', 'modelling', 'zurich'],
      employerIdx: 0,
    },

    // 5 ─ Education · contract · office · middle · French only · paid (EUR)
    {
      title: 'Формateur en Compétences Numériques',
      description: 'Ліонський центр безперервного навчання пропонує контракт на 12 місяців для тренера з цифрових навичок. Ви навчатимете дорослих слухачів офісним інструментам, базовій кібербезпеці та роботі з хмарними сервісами.',
      requirements: '3+ роки досвіду у навчанні дорослих. Знання пакету Microsoft 365. Педагогічна освіта або сертифікат тренера. Французька С1 (єдина робоча мова).',
      responsibilities: 'Проведення групових та індивідуальних тренінгів. Розробка навчальних матеріалів. Оцінка прогресу слухачів. Звітність перед керівником програми.',
      benefits: 'Річний контракт з можливістю продовження. Повний соціальний пакет. 25 днів відпустки. Офіс у центрі Ліона.',
      jobType: JobType.CONTRACT,
      experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.OFFICE,
      country: 'France',
      city: 'Lyon',
      salaryMin: 40000,
      salaryMax: 50000,
      salaryCurrency: 'EUR',
      stipendAmount: null,
      isPaid: true,
      category: 'education',
      requiredLanguages: ['french'],
      tags: ['training', 'education', 'france', 'digital-skills'],
      employerIdx: 1,
    },

    // 6 ─ Medicine · full_time · office · executive · English only · very high salary (USD)
    {
      title: 'Chief Medical Officer (CMO)',
      description: 'Бостонська біотехнологічна компанія, що розробляє онкологічні препарати Фази III, шукає Chief Medical Officer для керівництва клінічними операціями та взаємодії з FDA. Позиція C-level з прямою підпорядкованістю CEO.',
      requirements: 'MD або MD/PhD. 15+ років клінічної та промислової медицини. Досвід у FDA NDA/BLA submissions. Висока управлінська компетенція. Стратегічне мислення.',
      responsibilities: 'Керівництво клінічними випробуваннями. Комунікація з регуляторними органами (FDA, EMA). Представлення компанії на медичних конференціях. Побудова клінічної команди.',
      benefits: 'Базова зарплата $300k–$400k. Значний ESOP. Медична страховка преміум. Службовий автомобіль. Перельоти бізнес-класом.',
      jobType: JobType.FULL_TIME,
      experienceLevel: ExperienceLevel.EXECUTIVE,
      workFormat: WorkFormat.OFFICE,
      country: 'USA',
      city: 'Boston',
      salaryMin: 300000,
      salaryMax: 400000,
      salaryCurrency: 'USD',
      stipendAmount: null,
      isPaid: true,
      category: 'medicine',
      requiredLanguages: ['english'],
      tags: ['cmo', 'biotech', 'clinical', 'executive', 'usa'],
      employerIdx: 2,
    },

    // 7 ─ Law · full_time · hybrid · lead · Spanish + English · paid (EUR)
    {
      title: 'Директор юридичного департаменту (Head of Legal)',
      description: 'Барселонський медіахолдинг шукає Head of Legal для керівництва командою з 4 юристів. Ви відповідатимете за корпоративне право, медіаправо та захист даних у масштабі Іберійського ринку.',
      requirements: '8+ років досвіду в комерційному праві. 2+ роки у ролі керівника юридичної функції. Іспанська C2, англійська C1. Знання GDPR та іспанського трудового законодавства.',
      responsibilities: 'Управління юридичною командою. Правовий супровід M&A-угод. Договірна база з медіа-партнерами. Взаємодія з радою директорів.',
      benefits: 'Гібридний формат (2 дні офіс). 24 дні відпустки. Медичне страхування. Квартальний бонус. Корпоративне авто.',
      jobType: JobType.FULL_TIME,
      experienceLevel: ExperienceLevel.LEAD,
      workFormat: WorkFormat.HYBRID,
      country: 'Spain',
      city: 'Barcelona',
      salaryMin: 80000,
      salaryMax: 110000,
      salaryCurrency: 'EUR',
      stipendAmount: null,
      isPaid: true,
      category: 'law',
      requiredLanguages: ['spanish', 'english'],
      tags: ['head-of-legal', 'media', 'gdpr', 'spain'],
      employerIdx: 0,
    },

    // 8 ─ Logistics · remote (JobType) · remote (WorkFormat) · junior · Ukrainian + English · paid (UAH)
    {
      title: 'Менеджер з логістики (дистанційно)',
      description: 'Одеська компанія з експорту сільськогосподарської продукції шукає дистанційного менеджера з логістики для координації відвантажень у порту та взаємодії з міжнародними перевізниками.',
      requirements: '1+ рік досвіду в логістиці або ЗЕД. Знання Інкотермс 2020. Впевнене спілкування англійською з перевізниками. Уважність до деталей.',
      responsibilities: 'Бронювання контейнерів та морського фрахту. Підготовка митних документів. Відстеження вантажів. Комунікація з клієнтами та агентами в 5+ країнах.',
      benefits: 'Повністю дистанційна робота. Гнучкий графік. Оплата 30 000–45 000 ₴/міс. Корпоративне навчання. Перспектива росту.',
      jobType: JobType.REMOTE,
      experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.REMOTE,
      country: 'Ukraine',
      city: 'Odesa',
      salaryMin: 30000,
      salaryMax: 45000,
      salaryCurrency: 'UAH',
      stipendAmount: null,
      isPaid: true,
      category: 'logistics',
      requiredLanguages: ['ukrainian', 'english'],
      tags: ['logistics', 'remote', 'export', 'ukraine', 'sea-freight'],
      employerIdx: 1,
    },

    // 9 ─ Sales · full_time · hybrid · middle · English + French · paid (CAD)
    {
      title: 'Account Executive — Québec & Atlantic Canada',
      description: 'Торонтська SaaS-компанія розширює команду продажів і шукає Account Executive для ринку Квебеку та Атлантичної Канади. Знання французької відкриває доступ до ринку 8 млн франкомовних клієнтів.',
      requirements: '3+ роки у B2B SaaS-продажах. Досвід роботи з клієнтами в Квебеку — перевага. Англійська C1, французька B2+. Досвід роботи в Salesforce.',
      responsibilities: 'Пошук та кваліфікація нових клієнтів. Проведення демо-презентацій продукту. Переговори та укладання контрактів. Ведення CRM-записів.',
      benefits: 'Гібридний формат (2 дні в офісі Торонто). 70 000–90 000 CAD база + необмежена комісія. Опціони на акції. 4 тижні відпустки. Медичне страхування.',
      jobType: JobType.FULL_TIME,
      experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID,
      country: 'Canada',
      city: 'Toronto',
      salaryMin: 70000,
      salaryMax: 90000,
      salaryCurrency: 'CAD',
      stipendAmount: null,
      isPaid: true,
      category: 'sales',
      requiredLanguages: ['english', 'french'],
      tags: ['sales', 'saas', 'bilingual', 'canada', 'quebec'],
      employerIdx: 2,
    },

    // 10 ─ HR · part_time · hybrid · senior · English only · no salary · unpaid (volunteer)
    {
      title: 'HR Advisor (Pro Bono / Volunteer)',
      description: 'Амстердамська НКО, що підтримує біженців у пошуку роботи, шукає досвідченого HR-спеціаліста-волонтера (10 год/тиж) для консультування шукачів роботи та підготовки резюме та інтерв\'ю.',
      requirements: '5+ років досвіду в HR або рекрутингу. Розуміння ринку праці Нідерландів та ЄС. Емпатичність та терплячість. Англійська C1 (основна мова НКО).',
      responsibilities: 'Індивідуальні сесії кар\'єрного коучингу. Перевірка та редагування резюме. Підготовка до інтерв\'ю. Воркшопи з пошуку роботи.',
      benefits: 'Волонтерська позиція без оплати. Сертифікат волонтера. Нетворкінг з HR-спільнотою Амстердама. Можливість змінювати чиєсь життя на краще.',
      jobType: JobType.PART_TIME,
      experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID,
      country: 'Netherlands',
      city: 'Amsterdam',
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      stipendAmount: null,
      isPaid: false,
      category: 'hr',
      requiredLanguages: ['english'],
      tags: ['hr', 'volunteer', 'ngo', 'pro-bono', 'amsterdam'],
      employerIdx: 0,
    },
  ];

  let inserted = 0;
  for (const def of JOBS) {
    const employer = emp(def.employerIdx);
    const job = jobRepo.create({
      title: def.title,
      description: def.description,
      requirements: def.requirements,
      responsibilities: def.responsibilities,
      benefits: def.benefits,
      jobType: def.jobType,
      status: JobStatus.ACTIVE,
      experienceLevel: def.experienceLevel,
      workFormat: def.workFormat,
      country: def.country,
      city: def.city,
      salaryMin: def.salaryMin ?? undefined,
      salaryMax: def.salaryMax ?? undefined,
      salaryCurrency: def.salaryCurrency ?? undefined,
      stipendAmount: def.stipendAmount ?? undefined,
      isPaid: def.isPaid,
      isSalaryNegotiable: false,
      category: def.category,
      requiredSkills: [],
      employer,
      employerId: employer.id,
      vacanciesCount: 1,
      requiredLanguages: def.requiredLanguages,
      tags: def.tags,
      isRemote: def.workFormat === WorkFormat.REMOTE,
      publishedAt: new Date(),
      applicationDeadline: deadline,
    });

    await jobRepo.save(job);
    console.log(`  ✔ [${def.category}] ${def.title}`);
    inserted++;
  }

  console.log(`\n✅ Inserted ${inserted} filter-test jobs`);
  await DB.destroy();
  console.log('✅ Done');
}

main().catch(err => { console.error(err); process.exit(1); });
