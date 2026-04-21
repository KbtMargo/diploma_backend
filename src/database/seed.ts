import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from '../users/entities/user.entity';
import { Company, CompanyStatus, CompanySize } from '../companies/entities/company.entity';
import { Job, JobType, JobStatus, ExperienceLevel, WorkFormat } from '../jobs/entities/job.entity';
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

// ─── helpers ───────────────────────────────────────────────────────────────

const hash = (pw: string) => bcrypt.hash(pw, 10);

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi, '-').replace(/^-|-$/g, '');

// ─── data ──────────────────────────────────────────────────────────────────

const CATEGORIES: { name: string; icon: string; order: number }[] = [
  { name: 'Програмування',      icon: '💻', order: 1 },
  { name: 'Frontend',           icon: '🎨', order: 2 },
  { name: 'Backend',            icon: '⚙️', order: 3 },
  { name: 'Мобільна розробка',  icon: '📱', order: 4 },
  { name: 'DevOps & Cloud',     icon: '☁️', order: 5 },
  { name: 'Дизайн',             icon: '🖌️', order: 6 },
  { name: 'Аналіз даних',       icon: '📊', order: 7 },
];

const SKILLS_BY_CATEGORY: Record<string, { name: string; usageCount: number }[]> = {
  'Програмування': [
    { name: 'JavaScript', usageCount: 200 },
    { name: 'TypeScript', usageCount: 160 },
    { name: 'Python',     usageCount: 180 },
    { name: 'Java',       usageCount: 120 },
    { name: 'C#',         usageCount: 90  },
    { name: 'Go',         usageCount: 60  },
    { name: 'PHP',        usageCount: 80  },
    { name: 'Ruby',       usageCount: 40  },
    { name: 'C++',        usageCount: 70  },
    { name: 'Rust',       usageCount: 30  },
  ],
  'Frontend': [
    { name: 'React.js',    usageCount: 190 },
    { name: 'Vue.js',      usageCount: 130 },
    { name: 'Angular',     usageCount: 100 },
    { name: 'Next.js',     usageCount: 110 },
    { name: 'HTML/CSS',    usageCount: 210 },
    { name: 'Tailwind CSS',usageCount: 90  },
    { name: 'Redux',       usageCount: 80  },
    { name: 'GraphQL',     usageCount: 60  },
    { name: 'Webpack',     usageCount: 55  },
    { name: 'Vite',        usageCount: 50  },
  ],
  'Backend': [
    { name: 'Node.js',     usageCount: 160 },
    { name: 'NestJS',      usageCount: 70  },
    { name: 'Express.js',  usageCount: 120 },
    { name: 'Django',      usageCount: 60  },
    { name: 'PostgreSQL',  usageCount: 150 },
    { name: 'MongoDB',     usageCount: 110 },
    { name: 'Redis',       usageCount: 80  },
    { name: 'REST API',    usageCount: 170 },
    { name: 'Spring Boot', usageCount: 50  },
    { name: 'FastAPI',     usageCount: 40  },
  ],
  'Мобільна розробка': [
    { name: 'React Native', usageCount: 90  },
    { name: 'Flutter',      usageCount: 80  },
    { name: 'Swift',        usageCount: 50  },
    { name: 'Kotlin',       usageCount: 60  },
    { name: 'Dart',         usageCount: 70  },
    { name: 'Ionic',        usageCount: 30  },
  ],
  'DevOps & Cloud': [
    { name: 'Docker',      usageCount: 130 },
    { name: 'Kubernetes',  usageCount: 70  },
    { name: 'AWS',         usageCount: 90  },
    { name: 'CI/CD',       usageCount: 110 },
    { name: 'Linux',       usageCount: 140 },
    { name: 'Git',         usageCount: 220 },
    { name: 'Nginx',       usageCount: 70  },
    { name: 'Terraform',   usageCount: 40  },
    { name: 'Google Cloud',usageCount: 50  },
    { name: 'GitHub Actions', usageCount: 80 },
  ],
  'Дизайн': [
    { name: 'Figma',        usageCount: 110 },
    { name: 'Adobe XD',     usageCount: 60  },
    { name: 'UI/UX Design', usageCount: 95  },
    { name: 'Photoshop',    usageCount: 80  },
    { name: 'Illustrator',  usageCount: 55  },
    { name: 'Sketch',       usageCount: 40  },
  ],
  'Аналіз даних': [
    { name: 'Pandas',          usageCount: 65  },
    { name: 'NumPy',           usageCount: 55  },
    { name: 'SQL',             usageCount: 140 },
    { name: 'Machine Learning',usageCount: 75  },
    { name: 'TensorFlow',      usageCount: 45  },
    { name: 'Power BI',        usageCount: 60  },
    { name: 'Tableau',         usageCount: 40  },
    { name: 'Scikit-learn',    usageCount: 35  },
  ],
};

// ─── main ──────────────────────────────────────────────────────────────────

async function main() {
  await DB.initialize();
  console.log('✅ DB connected');

  // ── clear old data ────────────────────────────────────────────────────────
  await DB.query('DELETE FROM messages');
  await DB.query('DELETE FROM notifications');
  await DB.query('DELETE FROM audit_logs');
  await DB.query('DELETE FROM company_reviews');
  await DB.query('DELETE FROM applications');
  await DB.query('DELETE FROM saved_jobs');
  await DB.query('DELETE FROM user_skills');
  await DB.query('DELETE FROM job_skills');
  await DB.query('DELETE FROM jobs');
  await DB.query('DELETE FROM companies');
  await DB.query('DELETE FROM refresh_tokens');
  await DB.query('DELETE FROM users');
  await DB.query('DELETE FROM skills');
  await DB.query('DELETE FROM skill_categories');
  console.log('🗑️  Cleared old data');

  const userRepo    = DB.getRepository(User);
  const companyRepo = DB.getRepository(Company);
  const jobRepo     = DB.getRepository(Job);
  const appRepo     = DB.getRepository(Application);
  const skillRepo   = DB.getRepository(Skill);
  const catRepo     = DB.getRepository(SkillCategory);

  // ── skill categories ──────────────────────────────────────────────────────
  const categories: Record<string, SkillCategory> = {};
  for (const c of CATEGORIES) {
    const cat = catRepo.create(c);
    categories[c.name] = await catRepo.save(cat);
  }
  console.log('🏷️  Categories seeded');

  // ── skills ────────────────────────────────────────────────────────────────
  const skillMap: Record<string, Skill> = {};
  for (const [catName, skills] of Object.entries(SKILLS_BY_CATEGORY)) {
    for (const s of skills) {
      const sk = skillRepo.create({
        name: s.name,
        slug: slug(s.name),
        usageCount: s.usageCount,
        categoryId: categories[catName].id,
      });
      skillMap[s.name] = await skillRepo.save(sk);
    }
  }
  console.log(`🔧 Skills seeded (${Object.keys(skillMap).length})`);

  // ── admin ─────────────────────────────────────────────────────────────────
  const adminPw = await hash('Test1234!');
  const admin = await userRepo.save(userRepo.create({
    email: 'admin@platform.com',
    password: adminPw,
    firstName: 'Адмін',
    lastName: 'Платформи',
    role: UserRole.ADMIN,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Київ',
    summary: 'Адміністратор платформи для пошуку роботи.',
  }));
  console.log('👤 Admin seeded');

  // ── employers ─────────────────────────────────────────────────────────────
  const pw = await hash('Test1234!');

  const emp1 = await userRepo.save(userRepo.create({
    email: 'employer@itsolutions.ua',
    password: pw,
    firstName: 'Олена',
    lastName: 'Шевченко',
    role: UserRole.EMPLOYER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Київ',
    phoneNumber: '+380501234567',
    summary: 'HR-менеджер компанії IT Solutions Ukraine.',
  }));

  const emp2 = await userRepo.save(userRepo.create({
    email: 'employer@startuphub.ua',
    password: pw,
    firstName: 'Богдан',
    lastName: 'Кравченко',
    role: UserRole.EMPLOYER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Львів',
    phoneNumber: '+380671234567',
    summary: 'Засновник StartupHub.',
  }));

  const emp3 = await userRepo.save(userRepo.create({
    email: 'employer@globaldev.ua',
    password: pw,
    firstName: 'Ірина',
    lastName: 'Лисенко',
    role: UserRole.EMPLOYER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Харків',
    phoneNumber: '+380631234567',
    summary: 'Talent Acquisition Lead у GlobalDev.',
  }));

  console.log('👔 Employers seeded');

  // ── companies ─────────────────────────────────────────────────────────────
  const co1 = await companyRepo.save(companyRepo.create({
    name: 'IT Solutions Ukraine',
    slug: 'it-solutions-ukraine',
    ownerId: emp1.id,
    description: 'IT Solutions Ukraine — провідна IT-компанія, що спеціалізується на розробці програмного забезпечення та цифровій трансформації бізнесу. Ми об\'єднуємо талановитих фахівців для роботи над проєктами у сфері фінтеху, e-commerce та SaaS.',
    shortDescription: 'Провідна IT-компанія з повним циклом розробки ПЗ',
    website: 'https://itsolutions.ua',
    email: 'hr@itsolutions.ua',
    industry: 'Інформаційні технології',
    size: CompanySize.MEDIUM,
    status: CompanyStatus.VERIFIED,
    isVerified: true,
    foundedYear: 2015,
    totalEmployees: 120,
    totalJobsPosted: 4,
    rating: 5,
    reviewsCount: 23,
    specialties: ['Web Development', 'Mobile Development', 'Cloud Solutions', 'AI/ML'],
    locations: [{ country: 'Україна', city: 'Київ', address: 'вул. Хрещатик 1', isHeadquarters: true }],
    socialLinks: { linkedin: 'https://linkedin.com/company/itsolutions-ua' },
  }));

  const co2 = await companyRepo.save(companyRepo.create({
    name: 'StartupHub',
    slug: 'startuphub',
    ownerId: emp2.id,
    description: 'StartupHub — стартап-акселератор та IT-компанія у Львові. Ми будуємо продукти для міжнародного ринку, використовуючи найсучасніші технології. Наша команда складається з 35 ентузіастів, закоханих у свою справу.',
    shortDescription: 'Стартап-акселератор та продуктова компанія у Львові',
    website: 'https://startuphub.ua',
    email: 'jobs@startuphub.ua',
    industry: 'Стартапи та продуктова розробка',
    size: CompanySize.SMALL,
    status: CompanyStatus.ACTIVE,
    isVerified: false,
    foundedYear: 2020,
    totalEmployees: 35,
    totalJobsPosted: 3,
    rating: 5,
    reviewsCount: 8,
    specialties: ['SaaS', 'Mobile Apps', 'React', 'Node.js'],
    locations: [{ country: 'Україна', city: 'Львів', address: 'вул. Городоцька 15', isHeadquarters: true }],
  }));

  const co3 = await companyRepo.save(companyRepo.create({
    name: 'GlobalDev',
    slug: 'globaldev',
    ownerId: emp3.id,
    description: 'GlobalDev — міжнародна аутсорсингова компанія з офісами в Харкові, Варшаві та Берліні. Ми розробляємо ПЗ для клієнтів з Європи та США у сферах фінансів, охорони здоров\'я та ритейлу. 300+ фахівців, 8 років досвіду.',
    shortDescription: 'Міжнародна IT-аутсорсингова компанія',
    website: 'https://globaldev.com.ua',
    email: 'careers@globaldev.com.ua',
    industry: 'IT-аутсорсинг',
    size: CompanySize.LARGE,
    status: CompanyStatus.VERIFIED,
    isVerified: true,
    foundedYear: 2016,
    totalEmployees: 310,
    totalJobsPosted: 3,
    rating: 4,
    reviewsCount: 41,
    specialties: ['Outsourcing', 'DevOps', 'Mobile', 'Design'],
    locations: [
      { country: 'Україна', city: 'Харків', address: 'пр. Науки 14', isHeadquarters: true },
      { country: 'Польща', city: 'Варшава', isHeadquarters: false },
    ],
    socialLinks: { linkedin: 'https://linkedin.com/company/globaldev-ua', github: 'https://github.com/globaldev' },
  }));

  console.log('🏢 Companies seeded');

  // ── job seekers ───────────────────────────────────────────────────────────

  const seeker1 = userRepo.create({
    email: 'oleg@example.com',
    password: pw,
    firstName: 'Олег',
    lastName: 'Коваль',
    role: UserRole.JOB_SEEKER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Київ',
    phoneNumber: '+380507654321',
    summary: 'Захоплений Frontend-розробник з досвідом у React та TypeScript. Шукаю роботу в продуктовій або стартап-компанії. Люблю чистий код та сучасний UI.',
    languages: ['Українська', 'Англійська (B2)', 'Польська (A2)'],
    preferredCountries: ['Україна', 'Польща', 'Німеччина'],
    preferredJobTypes: ['full_time', 'remote'],
    education: [
      {
        institution: 'Київський політехнічний інститут',
        degree: 'Бакалавр',
        field: 'Комп\'ютерна інженерія',
        startDate: '2021-09-01',
        endDate: '2025-06-30',
        grade: '4.8 / 5.0',
        description: 'Факультет інформатики та обчислювальної техніки. Дипломна робота: "Розробка SPA-застосунку з використанням React та TypeScript"',
      },
    ],
    workExperience: [
      {
        company: 'WebAgency Kyiv',
        position: 'Frontend Intern',
        startDate: '2023-07-01',
        endDate: '2024-01-31',
        current: false,
        description: 'Розробляв інтерфейси для корпоративних сайтів на React. Брав участь у code review та покращенні продуктивності застосунків.',
        achievements: ['Скоротив час завантаження сторінок на 40% через lazy loading', 'Впровадив Storybook для документування компонентів'],
      },
    ],
    portfolio: [
      { title: 'Task Manager App', description: 'Full-stack додаток для управління завданнями на React + Node.js + PostgreSQL', url: 'https://github.com/oleg/task-manager' },
      { title: 'E-commerce UI Kit', description: 'Бібліотека UI-компонентів для інтернет-магазинів на Tailwind CSS', url: 'https://github.com/oleg/ecom-ui' },
    ],
    skills: [
      skillMap['React.js'], skillMap['TypeScript'], skillMap['HTML/CSS'],
      skillMap['Next.js'], skillMap['Tailwind CSS'], skillMap['Redux'],
    ],
  });
  const s1 = await userRepo.save(seeker1);

  const seeker2 = userRepo.create({
    email: 'maria@example.com',
    password: pw,
    firstName: 'Марія',
    lastName: 'Петренко',
    role: UserRole.JOB_SEEKER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Харків',
    phoneNumber: '+380671112233',
    summary: 'Backend-розробник з 1.5 роками досвіду. Спеціалізуюся на Node.js/NestJS та PostgreSQL. Маю досвід роботи з мікросервісами та REST API.',
    languages: ['Українська', 'Англійська (C1)'],
    preferredCountries: ['Україна', 'Нідерланди', 'Австрія'],
    preferredJobTypes: ['full_time', 'remote'],
    education: [
      {
        institution: 'Харківський національний університет ім. В.Н. Каразіна',
        degree: 'Магістр',
        field: 'Прикладна математика та інформатика',
        startDate: '2020-09-01',
        endDate: '2024-06-30',
        grade: '5.0 / 5.0',
      },
    ],
    workExperience: [
      {
        company: 'SoftServe',
        position: 'Junior Backend Developer',
        startDate: '2023-06-01',
        current: true,
        description: 'Розробляю та підтримую мікросервіси для фінтех-платформи. Пишу модульні тести, проводжу code review.',
        achievements: [
          'Реалізував систему сповіщень на основі WebSockets',
          'Оптимізував складні SQL-запити, знизивши latency на 60%',
          'Менторю двох junior-розробників',
        ],
      },
    ],
    portfolio: [
      { title: 'REST API Starter Kit', description: 'Шаблон NestJS-проєкту з JWT-авторизацією, Swagger та тестами', url: 'https://github.com/maria/nest-starter' },
    ],
    skills: [
      skillMap['Node.js'], skillMap['NestJS'], skillMap['PostgreSQL'],
      skillMap['TypeScript'], skillMap['REST API'], skillMap['Redis'],
    ],
  });
  const s2 = await userRepo.save(seeker2);

  const seeker3 = userRepo.create({
    email: 'dmytro@example.com',
    password: pw,
    firstName: 'Дмитро',
    lastName: 'Іванченко',
    role: UserRole.JOB_SEEKER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Львів',
    summary: 'Мобільний розробник, захоплений Flutter та React Native. Маю власні додатки в Google Play. Шукаю команду, де можна рости та розвиватися.',
    languages: ['Українська', 'Англійська (B1)'],
    preferredCountries: ['Україна', 'Чехія'],
    preferredJobTypes: ['full_time', 'remote', 'freelance'],
    education: [
      {
        institution: 'Національний університет "Львівська політехніка"',
        degree: 'Бакалавр',
        field: 'Системна інженерія',
        startDate: '2019-09-01',
        endDate: '2023-06-30',
      },
    ],
    portfolio: [
      { title: 'FitTracker', description: 'Додаток для відстеження тренувань на Flutter (Android & iOS). 500+ завантажень в Google Play.', url: 'https://github.com/dmytro/fittracker' },
      { title: 'Budget App', description: 'Простий менеджер бюджету на React Native з локальним збереженням', url: 'https://github.com/dmytro/budget-rn' },
    ],
    skills: [
      skillMap['React Native'], skillMap['Flutter'], skillMap['Dart'],
      skillMap['JavaScript'], skillMap['TypeScript'],
    ],
  });
  const s3 = await userRepo.save(seeker3);

  const seeker4 = userRepo.create({
    email: 'alina@example.com',
    password: pw,
    firstName: 'Аліна',
    lastName: 'Бондаренко',
    role: UserRole.JOB_SEEKER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Одеса',
    summary: 'Початківець-розробник full-stack. Завершила інтенсивний буткемп і маю кілька пет-проєктів. Активно навчаюся та шукаю першу комерційну роботу.',
    languages: ['Українська', 'Англійська (B1)', 'Французька (A1)'],
    preferredCountries: ['Україна'],
    preferredJobTypes: ['full_time', 'internship'],
    education: [
      {
        institution: 'Одеський національний політехнічний університет',
        degree: 'Бакалавр',
        field: 'Комп\'ютерні науки',
        startDate: '2020-09-01',
        endDate: '2024-06-30',
      },
    ],
    portfolio: [
      { title: 'Online Store', description: 'Інтернет-магазин на React + Node.js + PostgreSQL з кошиком та оплатою', url: 'https://github.com/alina/online-store' },
    ],
    skills: [
      skillMap['JavaScript'], skillMap['React.js'], skillMap['Node.js'],
      skillMap['PostgreSQL'], skillMap['HTML/CSS'],
    ],
  });
  const s4 = await userRepo.save(seeker4);

  const seeker5 = userRepo.create({
    email: 'artem@example.com',
    password: pw,
    firstName: 'Артем',
    lastName: 'Мороз',
    role: UserRole.JOB_SEEKER,
    isEmailVerified: true,
    isActive: true,
    country: 'Україна',
    city: 'Дніпро',
    phoneNumber: '+380993456789',
    summary: 'DevOps-інженер з 2 роками досвіду. Будую та підтримую CI/CD-пайплайни, автоматизую інфраструктуру на AWS. Захоплений Kubernetes та IaC.',
    languages: ['Українська', 'Англійська (B2)'],
    preferredCountries: ['Україна', 'Канада', 'США'],
    preferredJobTypes: ['full_time', 'remote'],
    education: [
      {
        institution: 'Дніпровський національний університет ім. О. Гончара',
        degree: 'Бакалавр',
        field: 'Комп\'ютерні технології',
        startDate: '2018-09-01',
        endDate: '2022-06-30',
      },
    ],
    workExperience: [
      {
        company: 'DataCenter Dnipro',
        position: 'System Administrator',
        startDate: '2022-07-01',
        endDate: '2023-06-30',
        current: false,
        description: 'Адміністрував Linux-сервери, налаштовував мережеве обладнання та резервне копіювання.',
      },
      {
        company: 'CloudTech Ukraine',
        position: 'DevOps Engineer',
        startDate: '2023-07-01',
        current: true,
        description: 'Розробляю та підтримую CI/CD-пайплайни на GitHub Actions. Управляю кластерами Kubernetes на AWS.',
        achievements: [
          'Скоротив час деплою з 45 хв до 8 хв',
          'Впровадив Terraform для IaC, що зменшило кількість ручних операцій на 80%',
        ],
      },
    ],
    skills: [
      skillMap['Docker'], skillMap['Kubernetes'], skillMap['Linux'],
      skillMap['Git'], skillMap['AWS'], skillMap['CI/CD'],
      skillMap['Terraform'], skillMap['Nginx'],
    ],
  });
  const s5 = await userRepo.save(seeker5);

  console.log('👥 Job seekers seeded');

  // ── jobs ──────────────────────────────────────────────────────────────────

  const deadline = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d;
  };

  const job1 = await jobRepo.save(jobRepo.create({
    title: 'Junior Frontend Developer (React)',
    description: 'Шукаємо молодого Frontend-розробника для роботи над нашою SaaS-платформою.\n\nВи будете частиною продуктової команди та матимете можливість впливати на дизайн рішень.',
    requirements: 'Знання React.js та TypeScript\nДосвід роботи з HTML/CSS та адаптивною версткою\nРозуміння REST API\nБажання навчатись та розвиватися',
    responsibilities: 'Розробка нових функцій UI\nПідтримка та рефакторинг існуючого коду\nУчасть у code review\nКомунікація з командою в Jira та Slack',
    benefits: 'Гнучкий графік роботи\nОплачуване навчання та конференції\n21 день відпустки\nМедичне страхування',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.JUNIOR,
    workFormat: WorkFormat.HYBRID,
    country: 'Україна',
    city: 'Київ',
    salaryMin: 800,
    salaryMax: 1200,
    salaryCurrency: 'USD',
    employerId: emp1.id,
    isUrgent: false,
    isFeatured: true,
    applicationDeadline: deadline(30),
    requiredSkills: [skillMap['React.js'], skillMap['TypeScript'], skillMap['HTML/CSS']],
    views: 87,
    applicationsCount: 0,
    category: 'Frontend',
  }));

  const job2 = await jobRepo.save(jobRepo.create({
    title: 'Middle Backend Developer (Node.js/NestJS)',
    description: 'IT Solutions Ukraine запрошує досвідченого Backend-розробника до команди, що розробляє мікросервісну архітектуру для великого фінтех-клієнта.',
    requirements: 'Досвід Node.js та NestJS від 2 років\nГлибокі знання PostgreSQL та оптимізації запитів\nДосвід роботи з Redis та черга повідомлень\nРозуміння принципів SOLID та чистої архітектури',
    responsibilities: 'Проектування та розробка мікросервісів\nОптимізація продуктивності БД\nНаписання unit та integration тестів\nКод-рев\'ю молодших розробників',
    benefits: 'Конкурентна заробітна плата\nРемоут або гібрид\nБюджет на навчання $500/рік\nАкції компанії',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.MIDDLE,
    workFormat: WorkFormat.HYBRID,
    country: 'Україна',
    city: 'Київ',
    salaryMin: 1500,
    salaryMax: 2500,
    salaryCurrency: 'USD',
    employerId: emp1.id,
    isUrgent: true,
    isFeatured: true,
    applicationDeadline: deadline(21),
    requiredSkills: [skillMap['Node.js'], skillMap['NestJS'], skillMap['PostgreSQL'], skillMap['TypeScript']],
    views: 134,
    applicationsCount: 0,
    category: 'Backend',
  }));

  const job3 = await jobRepo.save(jobRepo.create({
    title: 'Junior React Native Developer',
    description: 'StartupHub шукає Junior React Native розробника для роботи над нашим мобільним додатком для ринку США. Повністю remote, команда 8 людей.',
    requirements: 'Базові знання React Native та JavaScript/TypeScript\nРозуміння принципів мобільної розробки\nДосвід роботи з REST API\nАнглійська на рівні читання документації',
    responsibilities: 'Розробка нових екранів та компонентів\nІнтеграція з backend API\nФікс багів та покращення UX\nПідтримка iOS та Android версій',
    benefits: 'Повністю remote\nГнучкий графік\nМенторство від senior-розробника\nМожливість виходу на міжнародний ринок',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.JUNIOR,
    workFormat: WorkFormat.REMOTE,
    country: 'Україна',
    city: 'Львів',
    salaryMin: 700,
    salaryMax: 1000,
    salaryCurrency: 'USD',
    employerId: emp2.id,
    isRemote: true,
    isFeatured: false,
    applicationDeadline: deadline(45),
    requiredSkills: [skillMap['React Native'], skillMap['JavaScript'], skillMap['TypeScript']],
    views: 52,
    applicationsCount: 0,
    category: 'Мобільна розробка',
  }));

  const job4 = await jobRepo.save(jobRepo.create({
    title: 'Middle DevOps Engineer',
    description: 'GlobalDev розширює DevOps-команду. Ви будете відповідальні за CI/CD-інфраструктуру для 5+ проєктів з клієнтами в Євросоюзі та США.',
    requirements: 'Досвід Docker та Kubernetes від 2 років\nГлибоке знання Linux та bash-скриптування\nДосвід роботи з AWS або GCP\nРозуміння CI/CD (GitLab CI або GitHub Actions)',
    responsibilities: 'Підтримка та розвиток Kubernetes-кластерів\nАвтоматизація деплою через GitHub Actions\nМоніторинг та алертинг (Prometheus, Grafana)\nРобота з командами розробки',
    benefits: 'Міжнародний досвід\nСертифікація AWS за рахунок компанії\nГнучкий graphik\nКорпоративний спортзал',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.MIDDLE,
    workFormat: WorkFormat.HYBRID,
    country: 'Україна',
    city: 'Харків',
    salaryMin: 2000,
    salaryMax: 3000,
    salaryCurrency: 'USD',
    employerId: emp3.id,
    isUrgent: false,
    isFeatured: true,
    applicationDeadline: deadline(20),
    requiredSkills: [skillMap['Docker'], skillMap['Kubernetes'], skillMap['Linux'], skillMap['AWS'], skillMap['CI/CD']],
    views: 98,
    applicationsCount: 0,
    category: 'DevOps',
  }));

  const job5 = await jobRepo.save(jobRepo.create({
    title: 'Junior Full-Stack Developer (React + Node.js)',
    description: 'Starthub шукає Full-Stack розробника-початківця, готового вчитися та рости. Ідеально підійде випускникам або студентам останніх курсів.',
    requirements: 'Знання JavaScript та основ React.js\nБазові знання Node.js та Express\nВміння працювати з PostgreSQL\nПрагнення вчитися нового щодня',
    responsibilities: 'Розробка frontend та backend функціоналу\nІнтеграція з зовнішніми сервісами\nНаписання документації\nУчасть у щоденних standup-зустрічах',
    benefits: 'Менторство від senior-команди\nНавчальний бюджет $300/рік\nПовністю remote',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.JUNIOR,
    workFormat: WorkFormat.REMOTE,
    country: 'Україна',
    city: 'Львів',
    salaryMin: 900,
    salaryMax: 1400,
    salaryCurrency: 'USD',
    employerId: emp2.id,
    isRemote: true,
    isFeatured: false,
    applicationDeadline: deadline(60),
    requiredSkills: [skillMap['React.js'], skillMap['Node.js'], skillMap['PostgreSQL'], skillMap['JavaScript']],
    views: 73,
    applicationsCount: 0,
    category: 'Full-Stack',
  }));

  const job6 = await jobRepo.save(jobRepo.create({
    title: 'Python Data Engineer (Middle)',
    description: 'IT Solutions Ukraine шукає Data Engineer для роботи над аналітичною платформою нашого клієнта — великої FMCG-компанії.',
    requirements: 'Досвід Python від 2 років (Pandas, NumPy)\nГлибокі знання SQL та оптимізації запитів\nДосвід роботи з ETL-процесами\nРозуміння принципів data warehousing',
    responsibilities: 'Розробка та підтримка ETL-пайплайнів\nОптимізація запитів до бази даних\nІнтеграція нових джерел даних\nСтворення звітів та дашбордів',
    benefits: 'Робота з великими масивами даних\nКонкурентна зарплата\nОфіс у центрі Києва',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.MIDDLE,
    workFormat: WorkFormat.HYBRID,
    country: 'Україна',
    city: 'Київ',
    salaryMin: 1800,
    salaryMax: 2800,
    salaryCurrency: 'USD',
    employerId: emp1.id,
    isUrgent: false,
    isFeatured: false,
    applicationDeadline: deadline(25),
    requiredSkills: [skillMap['Python'], skillMap['SQL'], skillMap['Pandas'], skillMap['PostgreSQL']],
    views: 61,
    applicationsCount: 0,
    category: 'Аналіз даних',
  }));

  const job7 = await jobRepo.save(jobRepo.create({
    title: 'UI/UX Designer (Junior)',
    description: 'GlobalDev шукає молодого UI/UX Designer для участі в міжнародних проєктах. Ідеально для тих, хто хоче отримати досвід роботи з іноземними клієнтами.',
    requirements: 'Досвід роботи в Figma\nЗнання принципів UI/UX Design\nПортфоліо з 2-3 проєктами\nАнглійська на рівні читання та написання листів',
    responsibilities: 'Розробка UI для веб та мобільних застосунків\nПроведення user research\nСтворення wireframes та прототипів\nКомунікація з клієнтами',
    benefits: 'Міжнародний досвід\nМенторство від Senior Designer\nПарцільний remote',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.JUNIOR,
    workFormat: WorkFormat.HYBRID,
    country: 'Україна',
    city: 'Харків',
    salaryMin: 600,
    salaryMax: 1000,
    salaryCurrency: 'USD',
    employerId: emp3.id,
    isFeatured: false,
    applicationDeadline: deadline(35),
    requiredSkills: [skillMap['Figma'], skillMap['UI/UX Design']],
    views: 44,
    applicationsCount: 0,
    category: 'Дизайн',
  }));

  const job8 = await jobRepo.save(jobRepo.create({
    title: 'Middle Node.js Developer',
    description: 'Запрошуємо Node.js розробника для підсилення нашої backend-команди. Проєкт — B2B SaaS платформа для автоматизації логістики.',
    requirements: 'Досвід Node.js від 2 років\nЗнання TypeScript\nДосвід роботи з PostgreSQL та Redis\nРозуміння мікросервісної архітектури',
    responsibilities: 'Розробка нових endpoints та мікросервісів\nОптимізація існуючого коду\nНаписання тестів (Jest)\nКод-рев\'ю',
    benefits: 'Гнучкий графік\nКомпенсація спорту\nОфіс або remote',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.MIDDLE,
    workFormat: WorkFormat.HYBRID,
    country: 'Україна',
    city: 'Київ',
    salaryMin: 1500,
    salaryMax: 2200,
    salaryCurrency: 'USD',
    employerId: emp1.id,
    isUrgent: false,
    isFeatured: false,
    applicationDeadline: deadline(28),
    requiredSkills: [skillMap['Node.js'], skillMap['TypeScript'], skillMap['PostgreSQL'], skillMap['REST API']],
    views: 79,
    applicationsCount: 0,
    category: 'Backend',
  }));

  const job9 = await jobRepo.save(jobRepo.create({
    title: 'Junior Vue.js Developer',
    description: 'StartupHub шукає Vue.js розробника для роботи над нашим новим продуктом — платформою для онлайн-освіти.',
    requirements: 'Знання Vue.js 3 та Composition API\nДосвід з JavaScript та HTML/CSS\nРозуміння REST API та axios\nКомандний гравець',
    responsibilities: 'Розробка нових сторінок та компонентів на Vue.js\nІнтеграція з backend API\nФікс багів\nУчасть у плануванні спрінтів',
    benefits: 'Remote робота\nМолода та дружня команда\nМожливість швидкого зростання',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.JUNIOR,
    workFormat: WorkFormat.REMOTE,
    country: 'Україна',
    city: 'Львів',
    salaryMin: 700,
    salaryMax: 1100,
    salaryCurrency: 'USD',
    employerId: emp2.id,
    isRemote: true,
    isFeatured: false,
    applicationDeadline: deadline(40),
    requiredSkills: [skillMap['Vue.js'], skillMap['JavaScript'], skillMap['HTML/CSS']],
    views: 36,
    applicationsCount: 0,
    category: 'Frontend',
  }));

  const job10 = await jobRepo.save(jobRepo.create({
    title: 'Flutter Developer (Junior)',
    description: 'GlobalDev запрошує Flutter-розробника для роботи над кросплатформним мобільним додатком для клієнта з Австрії.',
    requirements: 'Базові знання Flutter та Dart\nРозуміння архітектурних патернів (BLoC або Provider)\nАнглійська (Intermediate)\nБажання вчитися',
    responsibilities: 'Розробка нових фіч у Flutter-додатку\nІнтеграція з REST API\nНаписання unit тестів\nKomunікація з клієнтом англійською',
    benefits: 'Міжнародний проєкт\nFlutter-менторство\nRemote можливість',
    jobType: JobType.FULL_TIME,
    status: JobStatus.ACTIVE,
    experienceLevel: ExperienceLevel.JUNIOR,
    workFormat: WorkFormat.REMOTE,
    country: 'Україна',
    city: 'Харків',
    salaryMin: 800,
    salaryMax: 1300,
    salaryCurrency: 'USD',
    employerId: emp3.id,
    isRemote: true,
    isFeatured: false,
    applicationDeadline: deadline(50),
    requiredSkills: [skillMap['Flutter'], skillMap['Dart'], skillMap['REST API']],
    views: 48,
    applicationsCount: 0,
    category: 'Мобільна розробка',
  }));

  console.log('💼 Jobs seeded');

  // ── applications ──────────────────────────────────────────────────────────

  const appsData: {
    applicant: User; job: Job; status: ApplicationStatus; notes?: string;
  }[] = [
    { applicant: s1, job: job1, status: ApplicationStatus.PENDING },
    { applicant: s1, job: job5, status: ApplicationStatus.REVIEWED },
    { applicant: s2, job: job2, status: ApplicationStatus.SHORTLISTED, notes: 'Відмінний кандидат, заплановано технічне інтерв\'ю' },
    { applicant: s2, job: job8, status: ApplicationStatus.PENDING },
    { applicant: s3, job: job3, status: ApplicationStatus.REVIEWED },
    { applicant: s3, job: job10, status: ApplicationStatus.PENDING },
    { applicant: s4, job: job1, status: ApplicationStatus.ACCEPTED, notes: 'Вибрано для стажування!' },
    { applicant: s4, job: job5, status: ApplicationStatus.PENDING },
    { applicant: s5, job: job4, status: ApplicationStatus.INTERVIEW_SCHEDULED, notes: 'Технічне інтерв\'ю 25.04.2026 о 14:00' },
  ];

  for (const { applicant, job, status, notes } of appsData) {
    const app = appRepo.create({
      applicantId: applicant.id,
      jobId: job.id,
      status,
      employerNotes: notes,
    });
    await appRepo.save(app);
    await jobRepo.increment({ id: job.id }, 'applicationsCount', 1);
  }

  console.log('📝 Applications seeded');

  // ── summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completed!');
  console.log('─'.repeat(45));
  console.log('Accounts (password: Test1234!):');
  console.log('  🔑 admin@platform.com        — Admin');
  console.log('  👔 employer@itsolutions.ua   — IT Solutions Ukraine');
  console.log('  👔 employer@startuphub.ua    — StartupHub');
  console.log('  👔 employer@globaldev.ua     — GlobalDev');
  console.log('  👤 oleg@example.com          — Олег Коваль (seeker)');
  console.log('  👤 maria@example.com         — Марія Петренко (seeker)');
  console.log('  👤 dmytro@example.com        — Дмитро Іванченко (seeker)');
  console.log('  👤 alina@example.com         — Аліна Бондаренко (seeker)');
  console.log('  👤 artem@example.com         — Артем Мороз (seeker)');
  console.log('─'.repeat(45));

  await DB.destroy();
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
