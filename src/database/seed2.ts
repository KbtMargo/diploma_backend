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

const hash = (pw: string) => bcrypt.hash(pw, 10);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi, '-').replace(/^-|-$/g, '');
const deadline = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  await DB.initialize();
  console.log('✅ DB connected');

  const userRepo    = DB.getRepository(User);
  const companyRepo = DB.getRepository(Company);
  const jobRepo     = DB.getRepository(Job);
  const appRepo     = DB.getRepository(Application);
  const skillRepo   = DB.getRepository(Skill);
  const reviewRepo  = DB.getRepository(CompanyReview);

  const pw = await hash('Test1234!');

  // Load existing skills
  const allSkills = await skillRepo.find();
  const sm: Record<string, Skill> = {};
  for (const s of allSkills) sm[s.name] = s;

  const pick = (...names: string[]) => names.map(n => sm[n]).filter(Boolean);

  // ── 7 new employers (skip if already exists) ─────────────────────────────────
  const empDefs = [
    { email: 'hr@techwave.ua',    password: pw, firstName: 'Максим',   lastName: 'Захаренко', role: UserRole.EMPLOYER, isEmailVerified: true, isActive: true, country: 'Україна', city: 'Київ',      phoneNumber: '+380501110001', summary: 'HR TechWave' },
    { email: 'hr@codebridge.ua',  password: pw, firstName: 'Наталія',  lastName: 'Гриценко',  role: UserRole.EMPLOYER, isEmailVerified: true, isActive: true, country: 'Україна', city: 'Одеса',     phoneNumber: '+380501110002', summary: 'HR CodeBridge' },
    { email: 'hr@devstudio.ua',   password: pw, firstName: 'Олексій',  lastName: 'Мартиненко',role: UserRole.EMPLOYER, isEmailVerified: true, isActive: true, country: 'Україна', city: 'Дніпро',    phoneNumber: '+380501110003', summary: 'HR DevStudio' },
    { email: 'hr@uadata.ua',      password: pw, firstName: 'Тетяна',   lastName: 'Романенко', role: UserRole.EMPLOYER, isEmailVerified: true, isActive: true, country: 'Україна', city: 'Харків',    phoneNumber: '+380501110004', summary: 'HR UAdata' },
    { email: 'hr@mobileteam.ua',  password: pw, firstName: 'Андрій',   lastName: 'Семененко', role: UserRole.EMPLOYER, isEmailVerified: true, isActive: true, country: 'Україна', city: 'Львів',     phoneNumber: '+380501110005', summary: 'HR MobileTeam' },
    { email: 'hr@designcraft.ua', password: pw, firstName: 'Вікторія', lastName: 'Поліщук',   role: UserRole.EMPLOYER, isEmailVerified: true, isActive: true, country: 'Україна', city: 'Київ',      phoneNumber: '+380501110006', summary: 'HR DesignCraft' },
    { email: 'hr@cloudsys.ua',    password: pw, firstName: 'Сергій',   lastName: 'Тимченко',  role: UserRole.EMPLOYER, isEmailVerified: true, isActive: true, country: 'Україна', city: 'Запоріжжя', phoneNumber: '+380501110007', summary: 'HR CloudSys' },
  ];
  const newEmps: User[] = [];
  for (const def of empDefs) {
    const existing = await userRepo.findOne({ where: { email: def.email } });
    if (existing) { newEmps.push(existing); }
    else { newEmps.push(await userRepo.save(userRepo.create(def))); }
  }
  const [emp4, emp5, emp6, emp7, emp8, emp9, emp10] = newEmps;
  console.log('👔 New employers seeded');

  // ── 7 new companies (skip if already exists) ─────────────────────────────────
  const saveCompany = async (data: any): Promise<Company> => {
    const existing = await companyRepo.findOne({ where: { slug: data.slug } });
    if (existing) return existing;
    return (await (companyRepo.save(companyRepo.create(data)) as unknown)) as Company;
  };
  const [co4, co5, co6, co7, co8, co9, co10] = await Promise.all([
    saveCompany({ name: 'TechWave', slug: 'techwave', ownerId: emp4.id, description: 'TechWave — продуктова IT-компанія, що розробляє SaaS-рішення для HR та рекрутингу. Наш флагманський продукт використовують 500+ компаній у 12 країнах.', shortDescription: 'SaaS-платформа для HR та рекрутингу', website: 'https://techwave.ua', email: 'hr@techwave.ua', industry: 'Інформаційні технології', size: CompanySize.MEDIUM, status: CompanyStatus.VERIFIED, isVerified: true, foundedYear: 2018, totalEmployees: 85, totalJobsPosted: 0, rating: 5, reviewsCount: 12, specialties: ['SaaS', 'React', 'Node.js', 'HR-tech'], locations: [{ country: 'Україна', city: 'Київ', isHeadquarters: true }] }),
    saveCompany({ name: 'CodeBridge', slug: 'codebridge', ownerId: emp5.id, description: 'CodeBridge — аутсорсингова компанія з Одеси, яка спеціалізується на розробці для e-commerce та fintech. Понад 6 років на ринку, 70+ клієнтів у Великобританії та Нідерландах.', shortDescription: 'E-commerce та fintech розробка для ЄС', website: 'https://codebridge.ua', email: 'hr@codebridge.ua', industry: 'IT-аутсорсинг', size: CompanySize.SMALL, status: CompanyStatus.VERIFIED, isVerified: true, foundedYear: 2017, totalEmployees: 45, totalJobsPosted: 0, rating: 4, reviewsCount: 7, specialties: ['E-commerce', 'Fintech', 'Vue.js', 'PHP'], locations: [{ country: 'Україна', city: 'Одеса', isHeadquarters: true }] }),
    saveCompany({ name: 'DevStudio Dnipro', slug: 'devstudio-dnipro', ownerId: emp6.id, description: 'DevStudio — незалежна студія розробки з Дніпра. Ми беремося за нестандартні проєкти: IoT, вбудовані системи, blockchain. Команда 25 людей, кожна — з унікальною експертизою.', shortDescription: 'Розробка IoT, blockchain та embedded систем', website: 'https://devstudio.dp.ua', email: 'hr@devstudio.ua', industry: 'Інформаційні технології', size: CompanySize.SMALL, status: CompanyStatus.PENDING, isVerified: false, foundedYear: 2021, totalEmployees: 25, totalJobsPosted: 0, rating: 0, reviewsCount: 0, specialties: ['IoT', 'Blockchain', 'Embedded', 'Python'], locations: [{ country: 'Україна', city: 'Дніпро', isHeadquarters: true }] }),
    saveCompany({ name: 'UAdata Analytics', slug: 'uadata-analytics', ownerId: emp7.id, description: 'UAdata — компанія у сфері аналітики даних та машинного навчання. Допомагаємо бізнесу приймати рішення на основі даних. Серед клієнтів — топ-20 ритейлерів України.', shortDescription: 'Data Science та ML для українського бізнесу', website: 'https://uadata.ua', email: 'hr@uadata.ua', industry: 'Аналіз даних', size: CompanySize.SMALL, status: CompanyStatus.VERIFIED, isVerified: true, foundedYear: 2019, totalEmployees: 30, totalJobsPosted: 0, rating: 5, reviewsCount: 9, specialties: ['Machine Learning', 'Data Science', 'Python', 'BI'], locations: [{ country: 'Україна', city: 'Харків', isHeadquarters: true }] }),
    saveCompany({ name: 'MobileTeam', slug: 'mobileteam', ownerId: emp8.id, description: 'MobileTeam — провідна студія мобільної розробки у Львові. Спеціалізуємося виключно на iOS та Android додатках. 80+ успішних проєктів в App Store та Google Play.', shortDescription: 'Топ-студія мобільної розробки у Львові', website: 'https://mobileteam.ua', email: 'hr@mobileteam.ua', industry: 'Мобільна розробка', size: CompanySize.SMALL, status: CompanyStatus.VERIFIED, isVerified: true, foundedYear: 2016, totalEmployees: 40, totalJobsPosted: 0, rating: 5, reviewsCount: 15, specialties: ['iOS', 'Android', 'React Native', 'Flutter'], locations: [{ country: 'Україна', city: 'Львів', isHeadquarters: true }] }),
    saveCompany({ name: 'DesignCraft Studio', slug: 'designcraft-studio', ownerId: emp9.id, description: 'DesignCraft — boutique-студія дизайну та фронтенд-розробки в Києві. Ми створюємо красиві цифрові продукти для стартапів та великих брендів. Клієнти з 20+ країн.', shortDescription: 'Boutique-студія UX/UI дизайну та frontend', website: 'https://designcraft.studio', email: 'hr@designcraft.ua', industry: 'Дизайн', size: CompanySize.SOLO, status: CompanyStatus.VERIFIED, isVerified: true, foundedYear: 2020, totalEmployees: 18, totalJobsPosted: 0, rating: 5, reviewsCount: 6, specialties: ['UI/UX', 'Figma', 'React', 'Branding'], locations: [{ country: 'Україна', city: 'Київ', isHeadquarters: true }] }),
    saveCompany({ name: 'CloudSys Ukraine', slug: 'cloudsys-ukraine', ownerId: emp10.id, description: 'CloudSys — системний інтегратор та cloud-провайдер. Будуємо хмарну інфраструктуру для середнього та великого бізнесу. AWS Advanced Partner. Офіси у Запоріжжі та Варшаві.', shortDescription: 'Cloud-інфраструктура та DevOps аутсорсинг', website: 'https://cloudsys.ua', email: 'hr@cloudsys.ua', industry: 'DevOps & Cloud', size: CompanySize.MEDIUM, status: CompanyStatus.VERIFIED, isVerified: true, foundedYear: 2014, totalEmployees: 110, totalJobsPosted: 0, rating: 4, reviewsCount: 18, specialties: ['AWS', 'Kubernetes', 'Terraform', 'DevOps'], locations: [{ country: 'Україна', city: 'Запоріжжя', isHeadquarters: true }, { country: 'Польща', city: 'Варшава', isHeadquarters: false }] }),
  ]);
  console.log('🏢 New companies seeded');

  // ── 40 new jobs ──────────────────────────────────────────────────────────────
  const jobsData = [
    // TechWave (emp4)
    { title: 'Senior React Developer', desc: 'Шукаємо Senior React розробника для розвитку нашого SaaS-продукту. Ви будете tech lead фронтенд-команди з 4 осіб.', req: 'React.js 4+ роки, TypeScript, Redux Toolkit, тестування (Jest/RTL), менторство juniors', resp: 'Архітектура фронтенд-рішень, code review, оцінка завдань, взаємодія з Product Manager', ben: 'Зарплата $2500–4000, акції компанії, remote, 24 дні відпустки', type: JobType.FULL_TIME, level: ExperienceLevel.SENIOR, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 2500, salMax: 4000, emp: emp4, co: co4, urgent: false, skills: pick('React.js','TypeScript','Redux','Next.js'), cat: 'Frontend', days: 30 },
    { title: 'Middle TypeScript Developer', desc: 'TechWave розширює продуктову команду. Шукаємо TypeScript розробника з досвідом full-stack розробки.', req: 'TypeScript 2+ роки, Node.js, React.js, досвід роботи з REST та GraphQL', resp: 'Full-stack розробка нових фіч, інтеграція з третіми сервісами, написання тестів', ben: 'Remote, гнучкий графік, бюджет навчання $600/рік', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 1800, salMax: 2800, emp: emp4, co: co4, urgent: true, skills: pick('TypeScript','React.js','Node.js','GraphQL'), cat: 'Full-Stack', days: 25 },
    { title: 'Junior QA Engineer', desc: 'Запрошуємо Junior QA для тестування нашої SaaS платформи. Буде можливість вчитись автоматизованому тестуванню.', req: 'Базові знання тестування ПЗ, бажання навчатись, уважність до деталей', resp: 'Мануальне тестування нових фіч, написання тест-кейсів, репорт багів', ben: 'Менторство, навчання Cypress, remote', type: JobType.FULL_TIME, level: ExperienceLevel.JUNIOR, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 600, salMax: 900, emp: emp4, co: co4, urgent: false, skills: pick('JavaScript','Git'), cat: 'Тестування', days: 45 },
    // CodeBridge (emp5)
    { title: 'PHP Developer (Laravel)', desc: 'CodeBridge шукає PHP розробника для роботи над e-commerce платформою клієнта з Великобританії.', req: 'PHP Laravel 2+ роки, MySQL/PostgreSQL, REST API, git', resp: 'Розробка backend для e-commerce, інтеграція платіжних систем, документація', ben: 'Remote, міжнародний проєкт, $1200–2000', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Одеса', salMin: 1200, salMax: 2000, emp: emp5, co: co5, urgent: false, skills: pick('PHP','PostgreSQL','REST API','Git'), cat: 'Backend', days: 35 },
    { title: 'Vue.js Frontend Developer', desc: 'Запрошуємо Vue.js розробника для роботи над фінтех-клієнтом. Проєкт: онлайн-банкінг для Нідерландів.', req: 'Vue.js 3 (Composition API) 1+ рік, TypeScript, Pinia/Vuex, тестування', resp: 'Розробка компонентів, інтеграція з API, оптимізація продуктивності', ben: 'Hybrid Одеса, міжнародний досвід', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.HYBRID, country: 'Україна', city: 'Одеса', salMin: 1300, salMax: 2200, emp: emp5, co: co5, urgent: false, skills: pick('Vue.js','TypeScript','JavaScript','HTML/CSS'), cat: 'Frontend', days: 30 },
    { title: 'Junior Backend Developer (Node.js)', desc: 'CodeBridge шукає junior backend розробника для підсилення команди на новому проєкті fintech.', req: 'Node.js базові знання, JavaScript/TypeScript, розуміння REST API, прагнення розвиватися', resp: 'Розробка API ендпоінтів, написання тестів, участь у code review', ben: 'Менторство, remote, $700–1100', type: JobType.FULL_TIME, level: ExperienceLevel.JUNIOR, format: WorkFormat.REMOTE, country: 'Україна', city: 'Одеса', salMin: 700, salMax: 1100, emp: emp5, co: co5, urgent: true, skills: pick('Node.js','JavaScript','TypeScript','REST API'), cat: 'Backend', days: 20 },
    // DevStudio (emp6)
    { title: 'Python Developer (IoT)', desc: 'DevStudio шукає Python розробника для роботи над IoT-платформою. Досвід роботи з MQTT та embedded системами буде перевагою.', req: 'Python 2+ роки, розуміння IoT-протоколів, SQL, Linux', resp: 'Розробка серверної частини IoT-платформи, інтеграція з пристроями, API', ben: 'Унікальний технічний стек, невелика команда, швидке зростання', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.OFFICE, country: 'Україна', city: 'Дніпро', salMin: 1400, salMax: 2200, emp: emp6, co: co6, urgent: false, skills: pick('Python','PostgreSQL','Linux','REST API'), cat: 'Backend', days: 40 },
    { title: 'Blockchain Developer (Solidity)', desc: 'Шукаємо розробника смарт-контрактів для роботи над DeFi проєктом. Досвід у web3 обов\'язковий.', req: 'Solidity, розуміння Ethereum/EVM, Web3.js або Ethers.js, безпека смарт-контрактів', resp: 'Написання та аудит смарт-контрактів, інтеграція з фронтендом, тестування', ben: 'Токен-компенсація, remote, унікальний проєкт', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Дніпро', salMin: 2000, salMax: 3500, emp: emp6, co: co6, urgent: false, skills: pick('JavaScript','TypeScript'), cat: 'Backend', days: 60 },
    { title: 'C++ Embedded Developer', desc: 'DevStudio шукає C++ розробника для роботи над embedded системами для промислової автоматизації.', req: 'C++ від 2 років, досвід embedded розробки, розуміння RTOS, Linux', resp: 'Розробка firmware для IoT-пристроїв, налагодження, документація', ben: 'Унікальний досвід, офіс у Дніпрі', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.OFFICE, country: 'Україна', city: 'Дніпро', salMin: 1500, salMax: 2500, emp: emp6, co: co6, urgent: true, skills: pick('C++','Linux','Git'), cat: 'Backend', days: 30 },
    // UAdata (emp7)
    { title: 'Data Scientist (ML Engineer)', desc: 'UAdata шукає Data Scientist для розробки ML-моделей для ритейл-клієнтів. Завдання: прогнозування попиту та рекомендаційні системи.', req: 'Python (Pandas, Scikit-learn, TensorFlow) 2+ роки, SQL, досвід роботи з реальними даними', resp: 'Розробка ML-моделей, A/B тестування, презентація результатів клієнтам', ben: 'Remote, конкурентна зарплата, доступ до великих датасетів', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Харків', salMin: 1800, salMax: 3000, emp: emp7, co: co7, urgent: false, skills: pick('Python','Machine Learning','SQL','Pandas','TensorFlow','Scikit-learn'), cat: 'Аналіз даних', days: 35 },
    { title: 'Junior Data Analyst', desc: 'UAdata запрошує Junior Data Analyst для роботи з бізнес-аналітикою ритейл-клієнтів.', req: 'SQL від 1 року, Excel/Google Sheets, базові Python або R, уважність до деталей', resp: 'Підготовка звітів, аналіз даних, побудова дашбордів у Power BI', ben: 'Менторство, remote, зростання до Data Scientist', type: JobType.FULL_TIME, level: ExperienceLevel.JUNIOR, format: WorkFormat.REMOTE, country: 'Україна', city: 'Харків', salMin: 700, salMax: 1100, emp: emp7, co: co7, urgent: false, skills: pick('SQL','Python','Power BI','Pandas'), cat: 'Аналіз даних', days: 40 },
    { title: 'BI Developer (Power BI)', desc: 'Шукаємо BI-розробника для побудови аналітичних звітів та дашбордів для топових ритейлерів України.', req: 'Power BI від 2 років, DAX, SQL, розуміння data warehouse', resp: 'Розробка дашбордів, оптимізація звітів, навчання клієнтів', ben: 'Hybrid Харків, конкурентна зарплата', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.HYBRID, country: 'Україна', city: 'Харків', salMin: 1300, salMax: 2000, emp: emp7, co: co7, urgent: false, skills: pick('SQL','Power BI','Tableau'), cat: 'Аналіз даних', days: 25 },
    // MobileTeam (emp8)
    { title: 'iOS Developer (Swift)', desc: 'MobileTeam шукає iOS розробника для роботи над power-user додатком у сфері health-tech. Продукт має 100k+ MAU.', req: 'Swift 2+ роки, UIKit та SwiftUI, знання iOS архітектур (MVVM, Clean), Combine', resp: 'Розробка нових фіч, перегляд коду, оптимізація продуктивності', ben: 'Топова мобільна команда, remote, $2000–3500', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Львів', salMin: 2000, salMax: 3500, emp: emp8, co: co8, urgent: false, skills: pick('Swift','Git'), cat: 'Мобільна розробка', days: 30 },
    { title: 'Android Developer (Kotlin)', desc: 'Запрошуємо Kotlin розробника для розробки Android-версії нашого health-tech продукту.', req: 'Kotlin 2+ роки, Jetpack Compose, архітектура MVVM, Coroutines', resp: 'Розробка та підтримка Android-додатку, CI/CD для мобільних, code review', ben: 'Remote Україна, міжнародна команда, $2000–3200', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Львів', salMin: 2000, salMax: 3200, emp: emp8, co: co8, urgent: false, skills: pick('Kotlin','Git'), cat: 'Мобільна розробка', days: 30 },
    { title: 'Junior Flutter Developer', desc: 'MobileTeam шукає junior Flutter розробника для нового проєкту з Австралії. Великий потенціал для зростання.', req: 'Flutter базові знання, Dart, розуміння мобільних платформ, портфоліо вітається', resp: 'Розробка компонентів на Flutter, написання тестів, участь у мобільних code review', ben: 'Менторство від Senior iOS/Android, remote', type: JobType.FULL_TIME, level: ExperienceLevel.JUNIOR, format: WorkFormat.REMOTE, country: 'Україна', city: 'Львів', salMin: 800, salMax: 1300, emp: emp8, co: co8, urgent: true, skills: pick('Flutter','Dart','React Native'), cat: 'Мобільна розробка', days: 20 },
    { title: 'React Native Developer (Middle)', desc: 'MobileTeam розширюється. Шукаємо Middle React Native розробника для cross-platform проєкту fintech.', req: 'React Native 2+ роки, TypeScript, Redux, інтеграція нативних модулів', resp: 'Розробка фіч, оптимізація, CI/CD, менторство juniors', ben: 'Remote, $1800–3000, відряджання до Польщі 2x/рік', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Львів', salMin: 1800, salMax: 3000, emp: emp8, co: co8, urgent: false, skills: pick('React Native','TypeScript','Redux','JavaScript'), cat: 'Мобільна розробка', days: 35 },
    // DesignCraft (emp9)
    { title: 'Senior UI/UX Designer', desc: 'DesignCraft шукає досвідченого дизайнера для роботи з міжнародними стартапами. Ви будете вести проєкти від ідеї до фінального дизайну.', req: 'Figma (майстерний рівень), 3+ роки UI/UX, портфоліо з мобільних і веб-проєктів, англійська B2+', resp: 'Проектування UX-флоків, розробка дизайн-систем, взаємодія з клієнтами напряму', ben: 'Remote, $2000–3500, міжнародні клієнти', type: JobType.FULL_TIME, level: ExperienceLevel.SENIOR, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 2000, salMax: 3500, emp: emp9, co: co9, urgent: false, skills: pick('Figma','UI/UX Design','Adobe XD'), cat: 'Дизайн', days: 30 },
    { title: 'Middle UI/UX Designer', desc: 'Запрошуємо Middle дизайнера до DesignCraft. Ви будете працювати над дизайном веб та мобільних додатків для стартапів з США та Великобританії.', req: 'Figma 2+ роки, розуміння user research, mobile-first дизайн, базові знання HTML/CSS', resp: 'Розробка wireframes, дизайн інтерфейсів, підготовка специфікацій для розробників', ben: 'Hybrid Київ, $1200–2000, навчання', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.HYBRID, country: 'Україна', city: 'Київ', salMin: 1200, salMax: 2000, emp: emp9, co: co9, urgent: false, skills: pick('Figma','UI/UX Design','Illustrator'), cat: 'Дизайн', days: 40 },
    { title: 'Junior Frontend Developer (Design focus)', desc: 'DesignCraft шукає Junior Frontend, який любить дизайн. Ви будете верстати на React те, що наша дизайн-команда розробила в Figma.', req: 'React.js, HTML/CSS (pixel-perfect), Tailwind або CSS-in-JS, увага до деталей', resp: 'Верстка дизайн-макетів, розробка UI-компонентів, участь у дизайн-рев\'ю', ben: 'Унікальний досвід дизайн+код, Київ hybrid, $800–1300', type: JobType.FULL_TIME, level: ExperienceLevel.JUNIOR, format: WorkFormat.HYBRID, country: 'Україна', city: 'Київ', salMin: 800, salMax: 1300, emp: emp9, co: co9, urgent: false, skills: pick('React.js','HTML/CSS','Tailwind CSS','JavaScript'), cat: 'Frontend', days: 35 },
    // CloudSys (emp10)
    { title: 'Senior DevOps Engineer', desc: 'CloudSys шукає Senior DevOps для керівництва командою з 5 інженерів та роботи з enterprise AWS-клієнтами.', req: 'AWS Solutions Architect рівень, Kubernetes expert, Terraform, 4+ роки досвіду', resp: 'Архітектура хмарних рішень для клієнтів, менторство, пресейл технічна підтримка', ben: 'AWS-сертифікація оплачується, $3000–5000, Запоріжжя або remote', type: JobType.FULL_TIME, level: ExperienceLevel.SENIOR, format: WorkFormat.HYBRID, country: 'Україна', city: 'Запоріжжя', salMin: 3000, salMax: 5000, emp: emp10, co: co10, urgent: false, skills: pick('AWS','Kubernetes','Terraform','Docker','CI/CD','Linux'), cat: 'DevOps', days: 30 },
    { title: 'Middle DevOps / Cloud Engineer', desc: 'CloudSys розширює команду. Потрібен Middle DevOps для роботи з AWS-інфраструктурою клієнтів середнього бізнесу.', req: 'AWS (EC2, EKS, RDS, S3), Kubernetes, Terraform, CI/CD 2+ роки', resp: 'Проектування та підтримка інфраструктури, автоматизація деплою, моніторинг', ben: 'AWS-сертифікація, remote можливість, $2000–3500', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.HYBRID, country: 'Україна', city: 'Запоріжжя', salMin: 2000, salMax: 3500, emp: emp10, co: co10, urgent: true, skills: pick('AWS','Kubernetes','Docker','Terraform','Linux'), cat: 'DevOps', days: 20 },
    { title: 'Junior DevOps Engineer', desc: 'CloudSys шукає junior DevOps для навчання та роботи під менторством senior-команди. Відмінний старт у хмарних технологіях.', req: 'Linux базові знання, розуміння Docker, Git, бажання розвиватися у DevOps', resp: 'Підтримка існуючої інфраструктури, написання скриптів автоматизації, документування', ben: 'Менторство, AWS-навчання за рахунок компанії, $600–1000', type: JobType.FULL_TIME, level: ExperienceLevel.JUNIOR, format: WorkFormat.OFFICE, country: 'Україна', city: 'Запоріжжя', salMin: 600, salMax: 1000, emp: emp10, co: co10, urgent: false, skills: pick('Linux','Docker','Git','CI/CD'), cat: 'DevOps', days: 50 },
    { title: 'SRE / Platform Engineer', desc: 'CloudSys шукає Site Reliability Engineer для підтримки high-load платформи enterprise клієнта (банківський сектор). 99.99% SLA.', req: 'Kubernetes advanced, Prometheus/Grafana, incident management, Python або Go для автоматизації', resp: 'On-call підтримка, оптимізація надійності систем, SLA управління', ben: 'Висока зарплата $3500–6000, компенсація on-call', type: JobType.FULL_TIME, level: ExperienceLevel.SENIOR, format: WorkFormat.HYBRID, country: 'Україна', city: 'Запоріжжя', salMin: 3500, salMax: 6000, emp: emp10, co: co10, urgent: true, skills: pick('Kubernetes','Docker','Linux','AWS','CI/CD'), cat: 'DevOps', days: 15 },
    // Extra mix
    { title: 'Go Backend Developer', desc: 'TechWave шукає Go розробника для побудови high-performance мікросервісів. Проєкт — B2B платформа з навантаженням 10k RPS.', req: 'Go 2+ роки, gRPC, PostgreSQL, Redis, Kafka або RabbitMQ', resp: 'Розробка мікросервісів, оптимізація продуктивності, проектування API', ben: 'Remote, $2500–4000, технічна свобода', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 2500, salMax: 4000, emp: emp4, co: co4, urgent: false, skills: pick('Go','PostgreSQL','Redis','Docker'), cat: 'Backend', days: 30 },
    { title: 'Full-Stack JavaScript Developer', desc: 'CodeBridge шукає повноцінного Full-Stack розробника для e-commerce клієнта. Стек: React + Node.js + PostgreSQL.', req: 'React.js + Node.js по 2+ роки, PostgreSQL, REST API, TypeScript', resp: 'Розробка від дизайну до деплою, інтеграція платіжних шлюзів', ben: 'Remote, міжнародний клієнт, $1500–2500', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Одеса', salMin: 1500, salMax: 2500, emp: emp5, co: co5, urgent: false, skills: pick('React.js','Node.js','TypeScript','PostgreSQL'), cat: 'Full-Stack', days: 35 },
    { title: 'Python Machine Learning Intern', desc: 'UAdata пропонує оплачуване стажування для студентів або свіжих випускників зі знанням Python та основ ML.', req: 'Python (Pandas, NumPy), базові знання ML, математична база (лінійна алгебра, статистика)', resp: 'Допомога команді Data Scientists, обробка даних, написання звітів', ben: 'Оплачуване стажування $400–600, менторство, remote', type: JobType.INTERNSHIP, level: ExperienceLevel.INTERN, format: WorkFormat.REMOTE, country: 'Україна', city: 'Харків', salMin: 400, salMax: 600, emp: emp7, co: co7, urgent: false, skills: pick('Python','Pandas','NumPy','Machine Learning'), cat: 'Аналіз даних', days: 45 },
    { title: 'Product Manager (Tech)', desc: 'TechWave шукає технічного Product Manager для управління roadmap нашого SaaS-продукту.', req: 'Досвід PM від 2 років у tech-компанії, розуміння agile, вміння читати технічну документацію', resp: 'Визначення пріоритетів розробки, робота з командою дизайнерів та розробників, аналіз метрик', ben: 'Remote, $2000–3500, вплив на продукт', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 2000, salMax: 3500, emp: emp4, co: co4, urgent: false, skills: pick('SQL','Git'), cat: 'Management', days: 30 },
    { title: 'Technical Writer', desc: 'DesignCraft шукає Technical Writer для документування дизайн-системи та API.', req: 'Досвід технічного написання, знання Markdown/Notion, базове розуміння UI/UX', resp: 'Написання документації для дизайн-системи, API docs, onboarding матеріали', ben: 'Remote, гнучкий графік, $1000–1500', type: JobType.PART_TIME, level: ExperienceLevel.JUNIOR, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 1000, salMax: 1500, emp: emp9, co: co9, urgent: false, skills: pick('HTML/CSS','Git'), cat: 'Інше', days: 60 },
    { title: 'Scrum Master / Agile Coach', desc: 'CloudSys шукає Scrum Master для фасилітації agile процесів у 3 командах розробки.', req: 'CSM або PSM сертифікат, досвід Scrum Master від 2 років, технічне розуміння', resp: 'Проведення ретроспектив, спрінт планування, усунення impediments', ben: 'Remote, $1800–2800', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Запоріжжя', salMin: 1800, salMax: 2800, emp: emp10, co: co10, urgent: false, skills: pick('Git'), cat: 'Management', days: 40 },
    { title: 'DevOps Intern / Trainee', desc: 'CloudSys пропонує оплачуване стажування DevOps для студентів старших курсів або свіжих випускників.', req: 'Linux базові знання, цікавість до DevOps, Git, бажано Docker basics', resp: 'Допомога команді, написання скриптів, документування, навчання', ben: 'Стажування $300–500, сертифікат AWS paid, 50% шанс на full-time', type: JobType.INTERNSHIP, level: ExperienceLevel.INTERN, format: WorkFormat.OFFICE, country: 'Україна', city: 'Запоріжжя', salMin: 300, salMax: 500, emp: emp10, co: co10, urgent: false, skills: pick('Linux','Docker','Git'), cat: 'DevOps', days: 60 },
    { title: 'Frontend React Intern', desc: 'TechWave відкриває програму стажування для студентів-розробників. Реальні задачі, менторство, можливість full-time.', req: 'Базові знання React.js або готовність швидко вивчити, HTML/CSS, JavaScript', resp: 'Розробка UI-компонентів під наглядом ментора, фікс мінорних багів, навчання', ben: 'Оплачуване стажування $400–700, remote', type: JobType.INTERNSHIP, level: ExperienceLevel.INTERN, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 400, salMax: 700, emp: emp4, co: co4, urgent: false, skills: pick('React.js','JavaScript','HTML/CSS'), cat: 'Frontend', days: 50 },
    { title: 'Java Developer (Spring Boot)', desc: 'CodeBridge шукає Java розробника для роботи над legacy-модернізацією фінансової системи клієнта.', req: 'Java Spring Boot 2+ роки, PostgreSQL, Hibernate, розуміння мікросервісів', resp: 'Рефакторинг legacy коду, розробка нових мікросервісів, документація', ben: 'Hybrid Одеса, цікавий legacy проєкт, $1500–2500', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.HYBRID, country: 'Україна', city: 'Одеса', salMin: 1500, salMax: 2500, emp: emp5, co: co5, urgent: false, skills: pick('Java','PostgreSQL','REST API','Git'), cat: 'Backend', days: 30 },
    { title: 'C# .NET Developer', desc: 'DevStudio шукає .NET розробника для промислового IoT-проєкту з інтеграцією з обладнанням SCADA.', req: 'C# .NET Core 2+ роки, REST/gRPC API, SQL Server або PostgreSQL', resp: 'Розробка сервісів збору даних з IoT-пристроїв, API для SCADA системи', ben: 'Унікальний індустріальний досвід, офіс Дніпро, $1500–2500', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.OFFICE, country: 'Україна', city: 'Дніпро', salMin: 1500, salMax: 2500, emp: emp6, co: co6, urgent: false, skills: pick('C#','PostgreSQL','REST API','Docker'), cat: 'Backend', days: 35 },
    { title: 'Graphic Designer / Brand Designer', desc: 'DesignCraft шукає Graphic Designer для роботи над брендингом стартапів: логотипи, гайдлайни, маркетингові матеріали.', req: 'Adobe Illustrator та Photoshop 2+ роки, портфоліо брендингових проєктів, розуміння типографіки', resp: 'Розробка логотипів та brand identity, дизайн маркетингових матеріалів, brand guidelines', ben: 'Remote, творча команда, $1000–1800', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 1000, salMax: 1800, emp: emp9, co: co9, urgent: false, skills: pick('Illustrator','Photoshop','Figma'), cat: 'Дизайн', days: 45 },
    { title: 'Angular Developer', desc: 'TechWave шукає Angular розробника для роботи над адмін-панеллю SaaS-продукту.', req: 'Angular 2+ роки, TypeScript, RxJS, Angular Material або PrimeNG', resp: 'Розробка складних форм та таблиць, оптимізація Angular додатку', ben: 'Remote, $1500–2500', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Київ', salMin: 1500, salMax: 2500, emp: emp4, co: co4, urgent: false, skills: pick('Angular','TypeScript','JavaScript','HTML/CSS'), cat: 'Frontend', days: 30 },
    { title: 'Marketing Manager (IT)', desc: 'MobileTeam шукає IT Marketing Manager для просування мобільного додатку на міжнародних ринках.', req: 'Досвід digital marketing у tech від 2 років, ASO, Meta/Google Ads, аналітика', resp: 'Управління рекламними кампаніями, ASO оптимізація, ведення соціальних мереж', ben: 'Remote, $1500–2500, бонус за результатами', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Львів', salMin: 1500, salMax: 2500, emp: emp8, co: co8, urgent: false, skills: pick('SQL'), cat: 'Маркетинг', days: 40 },
    { title: 'Ruby on Rails Developer', desc: 'CodeBridge шукає Ruby on Rails розробника для підтримки існуючого e-commerce проєкту клієнта з Ірландії.', req: 'Ruby on Rails 2+ роки, PostgreSQL, Sidekiq, базові React.js', resp: 'Підтримка та розвиток Rails додатку, інтеграція нових платіжних провайдерів', ben: 'Remote, $1500–2800', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Одеса', salMin: 1500, salMax: 2800, emp: emp5, co: co5, urgent: false, skills: pick('Ruby','PostgreSQL','REST API'), cat: 'Backend', days: 30 },
    { title: 'Kotlin Developer (Backend)', desc: 'UAdata шукає Kotlin Backend розробника для розробки ML-сервісів у JVM екосистемі.', req: 'Kotlin (Spring Boot або Ktor) 1+ рік, PostgreSQL, знання основ ML буде перевагою', resp: 'Розробка REST API для ML-моделей, оптимізація, документування', ben: 'Remote, унікальна intersекція ML + backend', type: JobType.FULL_TIME, level: ExperienceLevel.MIDDLE, format: WorkFormat.REMOTE, country: 'Україна', city: 'Харків', salMin: 1500, salMax: 2500, emp: emp7, co: co7, urgent: false, skills: pick('Kotlin','PostgreSQL','REST API','Docker'), cat: 'Backend', days: 35 },
  ];

  const savedJobs: Job[] = [];
  for (const j of jobsData) {
    const job = await jobRepo.save(jobRepo.create({
      title: j.title,
      description: j.desc,
      requirements: j.req,
      responsibilities: j.resp,
      benefits: j.ben,
      jobType: j.type,
      status: JobStatus.ACTIVE,
      experienceLevel: j.level,
      workFormat: j.format,
      country: j.country,
      city: j.city,
      salaryMin: j.salMin,
      salaryMax: j.salMax,
      salaryCurrency: 'USD',
      employerId: j.emp.id,
      isUrgent: j.urgent,
      isFeatured: false,
      applicationDeadline: deadline(j.days),
      requiredSkills: j.skills,
      views: Math.floor(Math.random() * 150) + 10,
      applicationsCount: 0,
      category: j.cat,
    }));
    savedJobs.push(job);
    await companyRepo.increment({ id: j.co.id }, 'totalJobsPosted', 1);
  }
  console.log(`💼 ${savedJobs.length} new jobs seeded`);

  // ── 40 new job seekers ───────────────────────────────────────────────────────
  const seekerData = [
    { email: 'ivan.k@example.com',    fn: 'Іван',      ln: 'Кириченко',   city: 'Київ',      sum: 'Senior React розробник з 5 роками досвіду. Шукаю продуктову компанію або strong стартап.', langs: ['Українська','Англійська (C1)'],          skills: pick('React.js','TypeScript','Next.js','Redux','GraphQL') },
    { email: 'yulia.m@example.com',   fn: 'Юлія',      ln: 'Мельник',     city: 'Харків',    sum: 'Data Scientist з ML-досвідом. Люблю NLP та рекомендаційні системи.', langs: ['Українська','Англійська (B2)'],              skills: pick('Python','Machine Learning','TensorFlow','Pandas','SQL') },
    { email: 'roman.b@example.com',   fn: 'Роман',     ln: 'Бублик',      city: 'Одеса',     sum: 'Full-Stack JavaScript з акцентом на React та Node.js. Маю 3 роки комерційного досвіду.', langs: ['Українська','Англійська (B2)','Польська'], skills: pick('React.js','Node.js','PostgreSQL','TypeScript','Docker') },
    { email: 'oksana.h@example.com',  fn: 'Оксана',    ln: 'Гончар',      city: 'Дніпро',    sum: 'Junior UI/UX дизайнер з портфоліо веб та мобільних проєктів. Закохана у Figma і pixel-perfect.', langs: ['Українська','Англійська (B1)'],       skills: pick('Figma','UI/UX Design','Adobe XD','Photoshop') },
    { email: 'serhiy.v@example.com',  fn: 'Сергій',    ln: 'Власенко',    city: 'Львів',     sum: 'Middle DevOps інженер. Спеціалізуюся на Kubernetes та AWS. Маю AWS Solutions Architect Associate.', langs: ['Українська','Англійська (B2)'],  skills: pick('Docker','Kubernetes','AWS','Terraform','CI/CD','Linux') },
    { email: 'kateryna.p@example.com',fn: 'Катерина',  ln: 'Пилипенко',   city: 'Київ',      sum: 'Junior Python розробник. Вивчаю machine learning, є досвід з pandas та sklearn.', langs: ['Українська','Англійська (B1)'],             skills: pick('Python','Pandas','NumPy','SQL','Machine Learning') },
    { email: 'andrii.t@example.com',  fn: 'Андрій',    ln: 'Тимченко',    city: 'Запоріжжя', sum: 'iOS розробник 3 роки. Публікував 4 додатки в App Store. Шукаю стабільну команду.', langs: ['Українська','Англійська (B2)'],             skills: pick('Swift','Kotlin','Git') },
    { email: 'larysa.s@example.com',  fn: 'Лариса',    ln: 'Сидоренко',   city: 'Київ',      sum: 'Middle Backend (Java/Spring Boot). Досвід з мікросервісами та event-driven архітектурою.', langs: ['Українська','Англійська (B2)'],         skills: pick('Java','Spring Boot','PostgreSQL','REST API','Docker') },
    { email: 'mykola.r@example.com',  fn: 'Микола',    ln: 'Руденко',     city: 'Харків',    sum: 'PHP розробник з досвідом Laravel та Symfony. Шукаю remote або гібрид.', langs: ['Українська','Англійська (B1)'],                 skills: pick('PHP','PostgreSQL','REST API','Git') },
    { email: 'natalia.z@example.com', fn: 'Наталія',   ln: 'Зінченко',    city: 'Вінниця',   sum: 'Junior React Native розробник. Маю 1 рік досвіду та особисті проєкти в Play Market.', langs: ['Українська','Англійська (A2)'],            skills: pick('React Native','JavaScript','TypeScript') },
    { email: 'vasyl.k@example.com',   fn: 'Василь',    ln: 'Ковальчук',   city: 'Київ',      sum: 'Angular розробник з 3 роками досвіду у enterprise проєктах. RxJS та NGRX — мій стек.', langs: ['Українська','Англійська (B2)'],             skills: pick('Angular','TypeScript','JavaScript','HTML/CSS') },
    { email: 'iryna.d@example.com',   fn: 'Ірина',     ln: 'Данченко',    city: 'Одеса',     sum: 'Senior UX дизайнер. 5 років у продуктових компаніях. Спеціалізуюся на SaaS-продуктах.', langs: ['Українська','Англійська (C1)','Французька'], skills: pick('Figma','UI/UX Design','Illustrator','Sketch') },
    { email: 'dmytro.h@example.com',  fn: 'Дмитро',    ln: 'Химченко',    city: 'Дніпро',    sum: 'Middle Go розробник. Маю досвід роботи з gRPC, Kafka та high-load системами.', langs: ['Українська','Англійська (B2)'],                 skills: pick('Go','PostgreSQL','Redis','Docker','Kubernetes') },
    { email: 'olena.f@example.com',   fn: 'Олена',     ln: 'Фесенко',     city: 'Полтава',   sum: 'Junior Vue.js розробник. Закінчила буткемп, маю 2 пет-проєкти. Швидко навчаюся.', langs: ['Українська','Англійська (B1)'],                skills: pick('Vue.js','JavaScript','HTML/CSS','Git') },
    { email: 'ruslan.m@example.com',  fn: 'Руслан',    ln: 'Мусієнко',    city: 'Харків',    sum: 'DevOps з AWS та GCP досвідом. Kubernetes CKA certified. Шукаю senior роль.', langs: ['Українська','Англійська (B2)'],                  skills: pick('Docker','Kubernetes','AWS','Terraform','CI/CD','GitHub Actions') },
    { email: 'anna.p@example.com',    fn: 'Анна',      ln: 'Панченко',    city: 'Київ',      sum: 'Middle Flutter розробник. Маю 3 роки досвіду, 5 продуктових додатків у сторах.', langs: ['Українська','Англійська (B2)'],                 skills: pick('Flutter','Dart','React Native','Git') },
    { email: 'heorhiy.b@example.com', fn: 'Георгій',   ln: 'Бондар',      city: 'Запоріжжя', sum: 'C# .NET розробник з досвідом у WPF та ASP.NET Core. Шукаю роботу з embedded або desktop.', langs: ['Українська','Англійська (B1)'],           skills: pick('C#','PostgreSQL','REST API','Docker') },
    { email: 'maryna.k@example.com',  fn: 'Марина',    ln: 'Кравченко',   city: 'Львів',     sum: 'Junior Data Analyst. Знаю SQL, Power BI, базовий Python. Шукаю стажування або junior роль.', langs: ['Українська','Англійська (B1)'],          skills: pick('SQL','Power BI','Pandas','Python') },
    { email: 'taras.h@example.com',   fn: 'Тарас',     ln: 'Гайда',       city: 'Тернопіль', sum: 'Kotlin Android розробник з 2 роками досвіду. Jetpack Compose та MVVM — мій стек.', langs: ['Українська','Англійська (B2)'],                 skills: pick('Kotlin','Dart','Git') },
    { email: 'sofiia.v@example.com',  fn: 'Софія',     ln: 'Войтенко',    city: 'Київ',      sum: 'Початківець-розробник. Закінчила КПІ цьогоріч. HTML/CSS/JS базово. Шукаю internship.', langs: ['Українська','Англійська (B1)'],               skills: pick('JavaScript','HTML/CSS','React.js') },
    { email: 'bohdan.l@example.com',  fn: 'Богдан',    ln: 'Лісовий',     city: 'Одеса',     sum: 'Middle Node.js розробник з досвідом WebSockets та real-time систем. Маю досвід GameDev backend.', langs: ['Українська','Англійська (B2)'],    skills: pick('Node.js','TypeScript','PostgreSQL','Redis','REST API') },
    { email: 'viktoriia.m@example.com',fn: 'Вікторія', ln: 'Мороз',       city: 'Миколаїв',  sum: 'Graphic Designer та ілюстратор. 3 роки brand identity. Шукаю creative studio або стартап.', langs: ['Українська','Англійська (B1)'],        skills: pick('Illustrator','Photoshop','Figma','Adobe XD') },
    { email: 'pavlo.s@example.com',   fn: 'Павло',     ln: 'Саченко',     city: 'Дніпро',    sum: 'Middle Python розробник зі спеціалізацією FastAPI та Celery. Досвід AWS Lambda.', langs: ['Українська','Англійська (B2)'],                 skills: pick('Python','PostgreSQL','Docker','REST API','Redis') },
    { email: 'daryna.k@example.com',  fn: 'Дарина',    ln: 'Клименко',    city: 'Київ',      sum: 'QA Engineer з 2 роками досвіду мануального та автоматизованого тестування (Cypress).', langs: ['Українська','Англійська (B2)'],              skills: pick('JavaScript','Git','REST API') },
    { email: 'oleksandr.n@example.com',fn: 'Олександр',ln: 'Назаренко',   city: 'Харків',    sum: 'Junior React розробник. 6 місяців у web-агентстві. Шукаю продуктову компанію для росту.', langs: ['Українська','Англійська (A2)'],             skills: pick('React.js','JavaScript','HTML/CSS','Tailwind CSS') },
    { email: 'liliia.b@example.com',  fn: 'Лілія',     ln: 'Бойченко',    city: 'Одеса',     sum: 'Middle Vue.js з акцентом на Nuxt.js та SSR. 2.5 роки в аутсорсингу.', langs: ['Українська','Англійська (B2)','Польська'],    skills: pick('Vue.js','JavaScript','TypeScript','HTML/CSS','Git') },
    { email: 'mykhailo.p@example.com',fn: 'Михайло',   ln: 'Паламаренко', city: 'Київ',      sum: 'Java розробник (Spring Ecosystem). Досвід Kafka, Elasticsearch. 4 роки у fintech.', langs: ['Українська','Англійська (B2)'],               skills: pick('Java','PostgreSQL','Docker','REST API','Redis') },
    { email: 'olga.t@example.com',    fn: 'Ольга',     ln: 'Тимошенко',   city: 'Запоріжжя', sum: 'Middle C++ розробник. Досвід системного програмування та embedded Linux. 3 роки.', langs: ['Українська','Англійська (B1)'],                skills: pick('C++','Linux','Git','Docker') },
    { email: 'denys.v@example.com',   fn: 'Денис',     ln: 'Волощенко',   city: 'Київ',      sum: 'Senior Node.js/TypeScript. Архітектура мікросервісів, team lead досвід. 6 років.', langs: ['Українська','Англійська (C1)'],                 skills: pick('Node.js','TypeScript','NestJS','PostgreSQL','Redis','Docker') },
    { email: 'hanna.m@example.com',   fn: 'Ганна',     ln: 'Москаленко',  city: 'Львів',     sum: 'Junior Kotlin Android розробник. Студентка 4 курсу, є pet-проєкти на GitHub.', langs: ['Українська','Англійська (B1)'],                    skills: pick('Kotlin','Java','Git') },
    { email: 'vladyslav.s@example.com',fn: 'Владислав',ln: 'Семко',       city: 'Харків',    sum: 'Middle .NET C# розробник. Мікросервіси, Azure, SignalR. 3 роки у product.', langs: ['Українська','Англійська (B2)'],                     skills: pick('C#','PostgreSQL','Docker','REST API') },
    { email: 'anastasiia.k@example.com',fn: 'Анастасія',ln: 'Клочко',     city: 'Дніпро',    sum: 'Senior UI/UX Designer з 6 роками досвіду. Design Systems expert. Менторувала 3 junior дизайнерів.', langs: ['Українська','Англійська (C1)'], skills: pick('Figma','UI/UX Design','Illustrator','Sketch','Adobe XD') },
    { email: 'yaroslav.h@example.com', fn: 'Ярослав',  ln: 'Харченко',    city: 'Одеса',     sum: 'Ruby on Rails розробник 3 роки. Побудував 2 стартапи з нуля. Шукаю цікавий проєкт.', langs: ['Українська','Англійська (B2)'],               skills: pick('Ruby','PostgreSQL','REST API','Docker','Redis') },
    { email: 'yelyzaveta.p@example.com',fn: 'Єлизавета',ln: 'Приймак',    city: 'Київ',      sum: 'Початківець-дизайнер. Закінчила онлайн-курс UX дизайну. Шукаю internship у Figma.', langs: ['Українська','Англійська (B1)'],                skills: pick('Figma','UI/UX Design') },
    { email: 'maksym.z@example.com',  fn: 'Максим',    ln: 'Захаров',     city: 'Харків',    sum: 'Middle Data Engineer. Airflow, dbt, Spark, BigQuery. 3 роки у data-driven компаніях.', langs: ['Українська','Англійська (B2)'],              skills: pick('Python','SQL','Pandas','NumPy','PostgreSQL') },
    { email: 'olesia.v@example.com',  fn: 'Олеся',     ln: 'Василенко',   city: 'Полтава',   sum: 'Junior Full-Stack (React+Node). Шукаю першу офіційну роботу після буткемпу.', langs: ['Українська','Англійська (B1)'],                     skills: pick('React.js','Node.js','JavaScript','HTML/CSS') },
    { email: 'kostiantyn.b@example.com',fn: 'Костянтин',ln: 'Безугла',    city: 'Київ',      sum: 'Senior Python розробник. FastAPI, gRPC, ML deployment. 5 років у tech.', langs: ['Українська','Англійська (B2)'],                     skills: pick('Python','PostgreSQL','Docker','Redis','Machine Learning') },
    { email: 'nadiia.m@example.com',  fn: 'Надія',     ln: 'Михайленко',  city: 'Чернівці',  sum: 'Junior iOS Swift розробник. Завершила курс UIKit. Шукаю першу роботу або стажування.', langs: ['Українська','Англійська (B1)'],               skills: pick('Swift','Git') },
    { email: 'yevhen.k@example.com',  fn: 'Євген',     ln: 'Карпенко',    city: 'Дніпро',    sum: 'Middle Go + Kubernetes. 3 роки у SRE ролі. Спеціалізація — observability та reliability.', langs: ['Українська','Англійська (B2)'],          skills: pick('Go','Kubernetes','Docker','Linux','AWS','CI/CD') },
    { email: 'marta.s@example.com',   fn: 'Марта',     ln: 'Стасюк',      city: 'Львів',     sum: 'Flutter розробник з 2 роками досвіду. iOS та Android. Знаю BLoC та Riverpod.', langs: ['Українська','Англійська (B2)'],                    skills: pick('Flutter','Dart','React Native','Git') },
  ];

  const newSeekers: User[] = [];
  for (const s of seekerData) {
    const existing = await userRepo.findOne({ where: { email: s.email } });
    if (existing) { newSeekers.push(existing); continue; }
    const u = await userRepo.save(userRepo.create({
      email: s.email,
      password: pw,
      firstName: s.fn,
      lastName: s.ln,
      role: UserRole.JOB_SEEKER,
      isEmailVerified: true,
      isActive: true,
      country: 'Україна',
      city: s.city,
      summary: s.sum,
      languages: s.langs,
      skills: s.skills,
    }));
    newSeekers.push(u);
  }
  console.log(`👥 ${newSeekers.length} new seekers seeded`);

  // ── applications (new seekers → new jobs) ────────────────────────────────────
  const appPairs = [
    { s: 0,  j: 0  }, { s: 0,  j: 13 }, // Ivan → Senior React, Angular
    { s: 1,  j: 9  }, { s: 1,  j: 10 }, // Yuliia → Data Scientist, Junior DA
    { s: 2,  j: 1  }, { s: 2,  j: 24 }, // Roman → TS Dev, Full-Stack
    { s: 3,  j: 15 }, { s: 3,  j: 16 }, // Oksana → Senior UX, Middle UX
    { s: 4,  j: 18 }, { s: 4,  j: 19 }, // Serhiy → Senior DevOps, Middle DevOps
    { s: 5,  j: 10 }, { s: 5,  j: 27 }, // Kateryna → Junior DA, ML Intern
    { s: 6,  j: 12 }, { s: 6,  j: 14 }, // Andrii → iOS, Android
    { s: 7,  j: 35 }, { s: 7,  j: 36 }, // Larysa → Java, C#
    { s: 8,  j: 3  }, { s: 8,  j: 33 }, // Mykola → PHP, Ruby
    { s: 9,  j: 14 }, { s: 9,  j: 15 }, // Natalia → React Native, Junior Flutter
    { s: 10, j: 37 },                    // Vasyl → Angular
    { s: 11, j: 15 }, { s: 11, j: 16 }, // Iryna → Senior UX, Middle UX
    { s: 12, j: 23 },                    // Dmytro → Go
    { s: 13, j: 4  },                    // Olena → Vue.js
    { s: 14, j: 18 }, { s: 14, j: 19 }, // Ruslan → Senior DevOps, Middle DevOps
    { s: 15, j: 14 }, { s: 15, j: 15 }, // Anna → Flutter
    { s: 16, j: 35 },                    // Heorhiy → C#
    { s: 17, j: 10 }, { s: 17, j: 11 }, // Maryna → Junior DA, BI
    { s: 18, j: 13 },                    // Taras → Android
    { s: 19, j: 30 },                    // Sofiia → React Intern
    { s: 20, j: 1  }, { s: 20, j: 5  }, // Bohdan → TS, Junior Node
    { s: 22, j: 22 },                    // Pavlo → Python IoT
    { s: 23, j: 2  },                    // Daryna → Junior QA
    { s: 24, j: 30 },                    // Oleksandr → React Intern
    { s: 25, j: 4  },                    // Liliia → Vue.js
    { s: 26, j: 35 },                    // Mykhailo → Java
    { s: 28, j: 1  },                    // Denys → TS Dev
    { s: 32, j: 33 },                    // Yaroslav → Ruby
    { s: 34, j: 9  }, { s: 34, j: 11 }, // Maksym → Data Scientist, BI
    { s: 35, j: 30 },                    // Olesia → React Intern
    { s: 36, j: 22 },                    // Kostiantyn → Python IoT
    { s: 38, j: 38 },                    // Yevhen → Go+K8s (SRE-similar)
    { s: 39, j: 14 },                    // Marta → Flutter
  ];

  const statuses = [
    ApplicationStatus.PENDING, ApplicationStatus.REVIEWED,
    ApplicationStatus.SHORTLISTED, ApplicationStatus.PENDING,
    ApplicationStatus.REVIEWED, ApplicationStatus.PENDING,
  ];

  for (const { s, j } of appPairs) {
    if (s >= newSeekers.length || j >= savedJobs.length) continue;
    const app = appRepo.create({
      applicantId: newSeekers[s].id,
      jobId: savedJobs[j].id,
      status: rand(statuses),
    });
    await appRepo.save(app);
    await jobRepo.increment({ id: savedJobs[j].id }, 'applicationsCount', 1);
  }
  console.log('📝 New applications seeded');

  // ── company reviews ───────────────────────────────────────────────────────────
  const reviewData = [
    { companyId: co4.id, userId: newSeekers[0].id,  title: 'Чудова продуктова компанія', content: 'TechWave — одна з найкращих компаній де я працювала. Є чіткі процеси, менторство та можливість впливати на продукт. Команда дуже дружна.', rating: 5, position: 'Senior React Developer', isRecommended: true },
    { companyId: co4.id, userId: newSeekers[2].id,  title: 'Хороший баланс роботи та відпочинку', content: 'Remote робота, гнучкий графік, адекватне керівництво. Завдання цікаві, є виклики. Трохи бракує офлайн-спілкування, але це мінус remote загалом.', rating: 4, position: 'Full-Stack Developer', isRecommended: true },
    { companyId: co5.id, userId: newSeekers[8].id,  title: 'Хороший аутсорс з міжнародними клієнтами', content: 'CodeBridge дає можливість попрацювати з іноземними клієнтами та поліпшити англійську. Проєкти цікаві, але навантаження буває нерівномірним.', rating: 4, position: 'PHP Developer', isRecommended: true },
    { companyId: co7.id, userId: newSeekers[1].id,  title: 'Найкраще місце для Data Science в Україні', content: 'UAdata — справжня ML компанія. Є доступ до великих датасетів, цікаві завдання з реального бізнесу. Команда топових фахівців. Рекомендую всім хто хоче рости в ML.', rating: 5, position: 'Data Scientist', isRecommended: true },
    { companyId: co7.id, userId: newSeekers[17].id, title: 'Хороший старт для аналітика', content: 'Для junior аналітика — відмінне місце. Менторство, реальні задачі, хороша команда. Зарплата відповідає рівню junior.', rating: 4, position: 'Junior Data Analyst', isRecommended: true },
    { companyId: co8.id, userId: newSeekers[6].id,  title: 'Топова мобільна студія', content: 'MobileTeam — це серйозна команда iOS/Android розробників. Вивчив Swift на новому рівні. Єдиний мінус — темп дуже швидкий, треба бути готовим.', rating: 5, position: 'iOS Developer', isRecommended: true },
    { companyId: co8.id, userId: newSeekers[15].id, title: 'Місце де ростуть мобільні розробники', content: 'Чудова команда, реальні продукти з користувачами. Менторство від senior\'ів допомагає рости швидко. Рекомендую для junior mobile.', rating: 5, position: 'Junior Flutter Developer', isRecommended: true },
    { companyId: co9.id, userId: newSeekers[11].id, title: 'Boutique студія з топ-клієнтами', content: 'DesignCraft — маленька але сильна команда дизайнерів. Клієнти з цікавими продуктами. Велика автономія у прийнятті дизайн-рішень. Ідеально для Senior дизайнера.', rating: 5, position: 'Senior UI/UX Designer', isRecommended: true },
    { companyId: co10.id, userId: newSeekers[4].id, title: 'Серйозний AWS партнер', content: 'CloudSys — справжня cloud-компанія. Є AWS-сертифікації, цікаві enterprise клієнти. Темп роботи інтенсивний, але результат варто того. Рекомендую DevOps фахівцям.', rating: 4, position: 'Middle DevOps Engineer', isRecommended: true },
    { companyId: co10.id, userId: newSeekers[14].id, title: 'Хороша школа для DevOps', content: 'Отримав AWS Certificate за рахунок компанії. Проєкти різноманітні. Менторство від Senior\'ів. Трохи строге management, але це enterprise специфіка.', rating: 4, position: 'Junior DevOps Engineer', isRecommended: true },
  ];

  for (const r of reviewData) {
    await reviewRepo.save(reviewRepo.create({
      companyId: r.companyId,
      userId: r.userId,
      title: r.title,
      content: r.content,
      rating: r.rating,
      position: r.position,
      isRecommended: r.isRecommended,
      isVerified: true,
    }));
    await companyRepo.increment({ id: r.companyId }, 'reviewsCount', 1);
  }
  console.log('⭐ Company reviews seeded');

  // ── summary ───────────────────────────────────────────────────────────────────
  const totalJobs = await jobRepo.count();
  const totalUsers = await userRepo.count();
  const totalCompanies = await companyRepo.count();
  const totalApps = await appRepo.count();

  console.log('\n✅ Seed2 completed!');
  console.log('─'.repeat(50));
  console.log(`📊 Total in DB: ${totalUsers} users, ${totalCompanies} companies, ${totalJobs} jobs, ${totalApps} applications`);
  console.log('─'.repeat(50));
  console.log('New employer accounts (password: Test1234!):');
  console.log('  👔 hr@techwave.ua      — TechWave');
  console.log('  👔 hr@codebridge.ua   — CodeBridge');
  console.log('  👔 hr@devstudio.ua    — DevStudio Dnipro');
  console.log('  👔 hr@uadata.ua       — UAdata Analytics');
  console.log('  👔 hr@mobileteam.ua   — MobileTeam');
  console.log('  👔 hr@designcraft.ua  — DesignCraft Studio');
  console.log('  👔 hr@cloudsys.ua     — CloudSys Ukraine');
  console.log('─'.repeat(50));

  await DB.destroy();
}

main().catch(err => {
  console.error('❌ Seed2 failed:', err.message);
  process.exit(1);
});
