import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Job, JobType, JobStatus, ExperienceLevel, WorkFormat } from '../jobs/entities/job.entity';
import { User, UserRole } from '../users/entities/user.entity';
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

// ── International companies to seed ─────────────────────────────────────────

const INT_COMPANIES = [
  {
    email: 'hr@nordictechgroup.no',
    firstName: 'Erik', lastName: 'Andersen',
    companyName: 'Nordic Tech Group',
    industry: 'IT та розробка',
    country: 'Norway', city: 'Oslo',
    size: CompanySize.LARGE,
    description: 'Leading Scandinavian software consultancy specializing in digital transformation for enterprise clients across the Nordics and Europe.',
    website: 'https://nordictechgroup.no',
  },
  {
    email: 'talent@apexdigital.ie',
    firstName: 'Siobhan', lastName: 'Murphy',
    companyName: 'Apex Digital',
    industry: 'Стартапи та продуктова розробка',
    country: 'Ireland', city: 'Dublin',
    size: CompanySize.MEDIUM,
    description: 'Dublin-based digital product studio building SaaS platforms for fintech, medtech, and legaltech clients across EMEA.',
    website: 'https://apexdigital.ie',
  },
  {
    email: 'careers@solanalatam.mx',
    firstName: 'Carlos', lastName: 'Reyes',
    companyName: 'Solana LATAM',
    industry: 'Маркетинг',
    country: 'Mexico', city: 'Mexico City',
    size: CompanySize.MEDIUM,
    description: 'Fast-growing Latin American digital marketing and growth agency serving brands across Mexico, Brazil, Colombia, and Argentina.',
    website: 'https://solanalatam.mx',
  },
  {
    email: 'jobs@horizonbio.dk',
    firstName: 'Mette', lastName: 'Nielsen',
    companyName: 'Horizon Biotech',
    industry: 'Медицина',
    country: 'Denmark', city: 'Copenhagen',
    size: CompanySize.LARGE,
    description: 'Danish biotech company developing next-generation diagnostics and therapeutics, with R&D centers in Copenhagen, Boston, and Singapore.',
    website: 'https://horizonbio.dk',
  },
  {
    email: 'recruit@sakurasystems.jp',
    firstName: 'Yuki', lastName: 'Tanaka',
    companyName: 'Sakura Systems',
    industry: 'IT та розробка',
    country: 'Japan', city: 'Tokyo',
    size: CompanySize.LARGE,
    description: 'Tokyo-based enterprise IT company delivering cloud, AI, and embedded systems solutions to Fortune 500 clients across Asia-Pacific.',
    website: 'https://sakurasystems.jp',
  },
];

async function main() {
  await DB.initialize();
  console.log('✅ DB connected');

  const userRepo    = DB.getRepository(User);
  const companyRepo = DB.getRepository(Company);
  const jobRepo     = DB.getRepository(Job);
  const skillRepo   = DB.getRepository(Skill);

  // ── Seed international employers + companies ──────────────────────────────
  const intEmployers: User[] = [];

  for (const c of INT_COMPANIES) {
    let user = await userRepo.findOne({ where: { email: c.email } });
    if (!user) {
      user = userRepo.create({
        email: c.email,
        password: await bcrypt.hash('Password123!', 10),
        firstName: c.firstName,
        lastName: c.lastName,
        role: UserRole.EMPLOYER,
        isActive: true,
        isEmailVerified: true,
      });
      user = await userRepo.save(user);

      const company = companyRepo.create({
        name: c.companyName,
        industry: c.industry,
        locations: [{ country: c.country, city: c.city, isHeadquarters: true }],
        size: c.size,
        description: c.description,
        website: c.website,
        isVerified: true,
        status: CompanyStatus.VERIFIED,
        owner: user,
        ownerId: user.id,
      });
      await companyRepo.save(company);
      console.log(`🏢 Created company: ${c.companyName}`);
    }
    intEmployers.push(user);
  }

  // Also pull in original 3 employers for variety
  const origEmployers = await userRepo.find({ where: [
    { email: 'employer@itsolutions.ua' },
    { email: 'employer@startuphub.ua' },
    { email: 'employer@globaldev.ua' },
  ]});

  const allEmployers = [...intEmployers, ...origEmployers];
  const emp = (i: number) => allEmployers[i % allEmployers.length];

  const allSkills = await skillRepo.find();
  const skills = (...names: string[]): Skill[] =>
    names.map(n => allSkills.find(s => s.name === n)).filter(Boolean) as Skill[];

  // ── 50 new jobs ───────────────────────────────────────────────────────────

  type JobDef = {
    title: string; description: string; requirements: string;
    responsibilities: string; benefits: string;
    jobType: JobType; experienceLevel: ExperienceLevel;
    workFormat: WorkFormat; country: string; city: string;
    salaryMin?: number; salaryMax?: number; salaryCurrency?: string;
    isSalaryNegotiable?: boolean; category: string;
    skillNames: string[]; employerIdx: number;
    vacanciesCount?: number; requiredLanguages?: string[];
    tags?: string[];
  };

  const JOBS: JobDef[] = [
    // ── IT (10) ──────────────────────────────────────────────────────────────
    {
      title: 'iOS Developer (Swift)',
      description: 'Dublin product startup is hiring an iOS Developer to build a consumer-facing health tracking app for the European market.',
      requirements: '2+ years iOS development. Swift and SwiftUI proficiency. App Store submission experience. Clean code advocate.',
      responsibilities: 'Build and maintain iOS app. Collaborate with UX designer and backend team. Optimize app performance. Prepare App Store releases.',
      benefits: 'Hybrid 2 days/week. 23 days leave. ESOP. Health insurance. Central Dublin office.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Ireland', city: 'Dublin',
      salaryMin: 65000, salaryMax: 85000, salaryCurrency: 'EUR',
      category: 'it', skillNames: ['Swift', 'Git', 'REST API'],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['ios', 'swift', 'mobile'],
    },
    {
      title: 'Android Developer (Kotlin)',
      description: 'Gothenburg fintech startup seeks an Android Developer to join the mobile team and help reshape how people manage their personal finances.',
      requirements: '1+ year Android development. Kotlin proficiency. Jetpack Compose experience preferred. Collaborative mindset.',
      responsibilities: 'Develop new Android features. Write unit and instrumented tests. Participate in design reviews. Support app release cycles.',
      benefits: 'Remote-first. Flexible hours. Learning allowance. Stock options. Quarterly team meetups.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.REMOTE, country: 'Sweden', city: 'Gothenburg',
      salaryMin: 480000, salaryMax: 600000, salaryCurrency: 'SEK',
      category: 'it', skillNames: ['Kotlin', 'Git', 'REST API'],
      employerIdx: 0, vacanciesCount: 2, requiredLanguages: ['English'],
      tags: ['android', 'kotlin', 'fintech'],
    },
    {
      title: 'Blockchain / Solidity Developer',
      description: 'Zug-based Web3 startup is seeking a Solidity developer to build smart contracts for a decentralized asset management protocol.',
      requirements: '3+ years Solidity. Experience with Hardhat or Foundry. Knowledge of DeFi protocols. Ethereum and EVM familiarity.',
      responsibilities: 'Design and implement smart contracts. Write comprehensive tests. Conduct internal audits. Integrate with frontend via ethers.js.',
      benefits: 'Remote work. Token compensation. Flexible hours. Cutting-edge tech stack.',
      jobType: JobType.CONTRACT, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.REMOTE, country: 'Switzerland', city: 'Zug',
      salaryMin: 140000, salaryMax: 200000, salaryCurrency: 'CHF',
      category: 'it', skillNames: ['JavaScript', 'TypeScript', 'Git'],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['blockchain', 'web3', 'solidity'],
    },
    {
      title: 'Site Reliability Engineer',
      description: 'Tokyo enterprise IT company is hiring an SRE to ensure reliability and scalability of their cloud infrastructure serving 10M+ users across APAC.',
      requirements: '4+ years SRE/DevOps experience. Kubernetes and Google Cloud proficiency. On-call experience. Incident management skills.',
      responsibilities: 'Maintain SLOs and SLAs. Lead incident response. Automate toil. Drive reliability improvements with product teams.',
      benefits: 'Hybrid 3 days/week. Full relocation package. Japanese language lessons. Comprehensive health plan.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Japan', city: 'Tokyo',
      salaryMin: 12000000, salaryMax: 16000000, salaryCurrency: 'JPY',
      category: 'it', skillNames: ['Kubernetes', 'Docker', 'Linux', 'CI/CD', 'Google Cloud'],
      employerIdx: 4, vacanciesCount: 1, requiredLanguages: ['English', 'Japanese'],
      tags: ['sre', 'reliability', 'cloud'],
    },
    {
      title: 'Embedded Systems Developer',
      description: 'Helsinki industrial tech company is looking for an Embedded Systems Developer to work on IoT firmware for smart energy metering devices.',
      requirements: '3+ years embedded C/C++. RTOS experience. Hardware debugging skills. Understanding of communication protocols (I2C, SPI, UART).',
      responsibilities: 'Develop firmware for microcontrollers. Debug hardware-software integration. Write technical documentation. Collaborate with hardware engineers.',
      benefits: 'Office in Helsinki tech hub. 5 weeks vacation. Bike benefit. Excellent pension.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.OFFICE, country: 'Finland', city: 'Helsinki',
      salaryMin: 55000, salaryMax: 72000, salaryCurrency: 'EUR',
      category: 'it', skillNames: ['C++', 'Linux', 'Git'],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['English', 'Finnish'],
      tags: ['embedded', 'iot', 'firmware'],
    },
    {
      title: 'Technical Product Manager',
      description: 'Oslo SaaS company is hiring a Technical Product Manager to lead development of a B2B analytics platform used by 500+ enterprise clients.',
      requirements: '4+ years product management. Engineering or CS background. Jira and Confluence proficiency. Agile/Scrum experience.',
      responsibilities: 'Own product roadmap. Write detailed specifications. Prioritize backlog. Coordinate releases. Track KPIs.',
      benefits: 'Hybrid work. 25 days leave. Stock options. Oslo city centre office.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Norway', city: 'Oslo',
      salaryMin: 900000, salaryMax: 1200000, salaryCurrency: 'NOK',
      category: 'it', skillNames: ['SQL', 'Git'],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['English', 'Norwegian'],
      tags: ['product-manager', 'saas', 'b2b'],
    },
    {
      title: 'Database Administrator (PostgreSQL)',
      description: 'Bucharest outsourcing company is seeking a DBA to manage and optimize PostgreSQL databases for multiple enterprise client projects.',
      requirements: '3+ years DBA experience. Deep PostgreSQL knowledge. Performance tuning expertise. Backup and recovery experience.',
      responsibilities: 'Manage database infrastructure. Optimize slow queries. Implement backup strategies. Support development teams.',
      benefits: 'Hybrid work. Private healthcare. Meal tickets. Annual bonus.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Romania', city: 'Bucharest',
      salaryMin: 8000, salaryMax: 12000, salaryCurrency: 'RON',
      category: 'it', skillNames: ['PostgreSQL', 'SQL', 'Linux'],
      employerIdx: 2, vacanciesCount: 2, requiredLanguages: ['Romanian', 'English'],
      tags: ['dba', 'postgresql', 'database'],
    },
    {
      title: 'AI Prompt Engineer',
      description: 'Bangalore AI startup is hiring a Prompt Engineer to design, test, and optimize prompts for production LLM-powered customer service products.',
      requirements: '1+ year working with LLMs. Python scripting. Analytical mindset. Ability to evaluate model outputs systematically.',
      responsibilities: 'Design and iterate prompts for GPT/Claude-based systems. A/B test prompt variations. Build evaluation frameworks. Document findings.',
      benefits: 'Fully remote. ESOP. Cutting-edge AI work. Annual visa support for relocation.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.REMOTE, country: 'India', city: 'Bangalore',
      salaryMin: 1400000, salaryMax: 2000000, salaryCurrency: 'INR',
      category: 'it', skillNames: ['Python', 'SQL'],
      employerIdx: 3, vacanciesCount: 2, requiredLanguages: ['English'],
      tags: ['ai', 'llm', 'prompt-engineering'],
    },
    {
      title: 'Software Architect',
      description: 'Copenhagen fintech is looking for a Software Architect to define the technical vision and ensure architectural consistency across 12 engineering teams.',
      requirements: '10+ years software engineering. 3+ years architecture experience. Microservices and event-driven systems expertise. Excellent communication skills.',
      responsibilities: 'Define architecture standards. Review designs and code. Lead tech guilds. Mentor senior engineers. Evaluate new technologies.',
      benefits: 'Hybrid work. 6 weeks leave. Generous pension. Architect budget. Conference speaking opportunities.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.LEAD,
      workFormat: WorkFormat.HYBRID, country: 'Denmark', city: 'Copenhagen',
      salaryMin: 900000, salaryMax: 1100000, salaryCurrency: 'DKK',
      category: 'it', skillNames: ['Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'AWS'],
      employerIdx: 3, vacanciesCount: 1, requiredLanguages: ['English', 'Danish'],
      tags: ['architecture', 'microservices', 'fintech'],
    },
    {
      title: 'Vue.js Developer',
      description: 'Lisbon tech startup is seeking a Vue.js Developer for a freelance project to build an interactive SaaS dashboard for property management clients.',
      requirements: '2+ years Vue.js experience. TypeScript proficiency. REST API integration. Figma handoff experience.',
      responsibilities: 'Build frontend features for SaaS dashboard. Collaborate with designers. Integrate backend APIs. Deliver on schedule.',
      benefits: 'Flexible freelance schedule. Remote work. Competitive hourly rate. Potential long-term engagement.',
      jobType: JobType.FREELANCE, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.REMOTE, country: 'Portugal', city: 'Lisbon',
      salaryMin: 45, salaryMax: 70, salaryCurrency: 'EUR',
      category: 'it', skillNames: ['Vue.js', 'TypeScript', 'HTML/CSS', 'REST API'],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['vuejs', 'frontend', 'freelance'],
    },

    // ── Design (5) ───────────────────────────────────────────────────────────
    {
      title: '3D Product Visualisation Designer',
      description: 'Milan luxury goods brand is hiring a 3D Designer to create photorealistic product visualisations for e-commerce and marketing campaigns.',
      requirements: '3+ years 3D design. Blender or Cinema 4D proficiency. Photorealistic rendering skills. Eye for luxury aesthetics.',
      responsibilities: 'Create 3D product renders. Animate product showcases. Collaborate with marketing team. Maintain 3D asset library.',
      benefits: 'Hybrid work in Milan fashion district. Company discounts. Training budget. International travel.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Italy', city: 'Milan',
      salaryMin: 38000, salaryMax: 50000, salaryCurrency: 'EUR',
      category: 'design', skillNames: ['Photoshop', 'Illustrator'],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['Italian', 'English'],
      tags: ['3d', 'luxury', 'product-design'],
    },
    {
      title: 'UX Researcher',
      description: 'Dublin EMEA HQ of a global software company seeks a UX Researcher to lead qualitative and quantitative research for a product used in 50+ countries.',
      requirements: '3+ years UX research. Mixed-methods research experience. Usability testing facilitation. Experience with research analysis tools.',
      responsibilities: 'Plan and execute user research studies. Synthesize insights. Communicate findings to product and design teams. Build a research repository.',
      benefits: 'Hybrid 2 days/week. 23 days leave. Healthcare. Bonus. Global team exposure.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Ireland', city: 'Dublin',
      salaryMin: 65000, salaryMax: 80000, salaryCurrency: 'EUR',
      category: 'design', skillNames: ['Figma', 'UI/UX Design'],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['ux-research', 'user-research', 'product'],
    },
    {
      title: 'Video Producer & Editor',
      description: 'São Paulo creative agency is seeking a freelance Video Producer/Editor for a 3-month campaign project for a major beverage brand.',
      requirements: '3+ years video production. Premiere Pro and After Effects proficiency. Brazilian Portuguese native. Experience with advertising content.',
      responsibilities: 'Film and edit video content. Direct short-form ads. Manage post-production workflow. Deliver broadcast-ready files.',
      benefits: 'Competitive freelance rate. Creative freedom. Flexible schedule.',
      jobType: JobType.FREELANCE, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Brazil', city: 'São Paulo',
      salaryMin: 8000, salaryMax: 15000, salaryCurrency: 'BRL',
      category: 'design', skillNames: ['Photoshop'],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['Portuguese', 'English'],
      tags: ['video', 'production', 'advertising'],
    },
    {
      title: 'Game UI/UX Designer',
      description: 'Seoul mobile game studio is looking for a Game UI Designer to craft intuitive and visually stunning interfaces for their top-10 APAC mobile games.',
      requirements: '2+ years game UI design. Figma and Unity UI experience. Understanding of mobile game mechanics. Strong portfolio of game interfaces.',
      responsibilities: 'Design game UI screens and flows. Create UI animation specs. Collaborate with art director. Implement UI in Unity.',
      benefits: 'Hybrid work. Competitive salary. Annual bonus. Health insurance. Game-focused culture.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'South Korea', city: 'Seoul',
      salaryMin: 55000000, salaryMax: 70000000, salaryCurrency: 'KRW',
      category: 'design', skillNames: ['Figma', 'UI/UX Design', 'Photoshop'],
      employerIdx: 4, vacanciesCount: 1, requiredLanguages: ['Korean', 'English'],
      tags: ['game-ui', 'mobile', 'unity'],
    },
    {
      title: 'Junior Graphic Designer',
      description: 'Istanbul advertising agency is looking for an enthusiastic Junior Graphic Designer to join the creative team and work on local and international brand campaigns.',
      requirements: 'Relevant design degree or portfolio. Adobe Creative Suite basics. Creative thinker. Eager to learn.',
      responsibilities: 'Assist senior designers with campaign assets. Create social media visuals. Prepare presentation decks. Maintain brand consistency.',
      benefits: 'Office in Levent. Young dynamic team. Fast career growth. Training opportunities.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.OFFICE, country: 'Turkey', city: 'Istanbul',
      salaryMin: 25000, salaryMax: 40000, salaryCurrency: 'TRY',
      category: 'design', skillNames: ['Photoshop', 'Illustrator', 'Figma'],
      employerIdx: 0, vacanciesCount: 2, requiredLanguages: ['Turkish', 'English'],
      tags: ['graphic-design', 'advertising', 'junior'],
    },

    // ── Marketing (5) ────────────────────────────────────────────────────────
    {
      title: 'Growth Marketing Manager',
      description: 'Mexico City fintech startup is hiring a Growth Marketing Manager to drive user acquisition across LATAM through digital and growth channels.',
      requirements: '3+ years growth/performance marketing. Experience with LATAM markets. Spanish and English fluency. Data-driven mindset.',
      responsibilities: 'Design and run growth experiments. Manage paid acquisition channels. Optimize funnel conversion. Report on CAC and LTV.',
      benefits: 'Remote-first. Equity. Flexible hours. International growth trajectory.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.REMOTE, country: 'Mexico', city: 'Mexico City',
      salaryMin: 80000, salaryMax: 120000, salaryCurrency: 'MXN',
      category: 'marketing', skillNames: ['SQL'],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['Spanish', 'English'],
      tags: ['growth', 'latam', 'fintech'],
    },
    {
      title: 'Brand Strategist',
      description: 'Brussels-based international NGO is looking for a Brand Strategist to define and communicate its mission across 40 countries.',
      requirements: '5+ years brand strategy. Non-profit or international organisation experience preferred. Excellent written communication. Multilingual a plus.',
      responsibilities: 'Develop brand strategy and messaging framework. Guide visual identity. Manage agency relationships. Align communications globally.',
      benefits: 'Hybrid work. EU public holidays. International environment. Mission-driven culture.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Belgium', city: 'Brussels',
      salaryMin: 70000, salaryMax: 90000, salaryCurrency: 'EUR',
      category: 'marketing', skillNames: [],
      employerIdx: 3, vacanciesCount: 1, requiredLanguages: ['English', 'French'],
      tags: ['brand-strategy', 'ngo', 'international'],
    },
    {
      title: 'PR & Communications Manager',
      description: 'Oslo clean energy scale-up is hiring a PR Manager to raise its profile in the European press and manage investor communications.',
      requirements: '5+ years PR in tech or energy. Strong media network. Excellent writing in English. Crisis communications experience preferred.',
      responsibilities: 'Build and execute PR strategy. Draft press releases and media pitches. Manage spokesperson. Oversee social media presence.',
      benefits: 'Hybrid work. 25 days leave. Pension. Impact-driven work in clean energy.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Norway', city: 'Oslo',
      salaryMin: 750000, salaryMax: 950000, salaryCurrency: 'NOK',
      category: 'marketing', skillNames: [],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['English', 'Norwegian'],
      tags: ['pr', 'communications', 'clean-energy'],
    },
    {
      title: 'Product Marketing Manager',
      description: 'Bangalore SaaS company is seeking a Product Marketing Manager to drive go-to-market for new features targeting SME customers across South and Southeast Asia.',
      requirements: '3+ years product marketing. B2B SaaS experience. Ability to create compelling positioning. Content and enablement experience.',
      responsibilities: 'Develop positioning and messaging. Create launch plans. Enable sales team. Gather market intelligence.',
      benefits: 'Hybrid work. Health insurance. ESOP. Annual performance bonus.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'India', city: 'Bangalore',
      salaryMin: 1800000, salaryMax: 2800000, salaryCurrency: 'INR',
      category: 'marketing', skillNames: [],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['English', 'Hindi'],
      tags: ['product-marketing', 'saas', 'b2b'],
    },
    {
      title: 'Community Manager (Web3)',
      description: 'Lisbon-based Web3 protocol is hiring a Community Manager to build and engage a global crypto community across Discord, X, and Telegram.',
      requirements: '2+ years community management. Deep understanding of crypto/Web3 culture. Excellent English writing. Experience managing large Discord servers.',
      responsibilities: 'Moderate and grow Discord community. Create content for social channels. Organize AMAs and community events. Gather feedback.',
      benefits: 'Fully remote. Token compensation. Crypto-native team. International community.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.REMOTE, country: 'Portugal', city: 'Lisbon',
      salaryMin: 30000, salaryMax: 45000, salaryCurrency: 'EUR',
      category: 'marketing', skillNames: [],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['community', 'web3', 'crypto'],
    },

    // ── Finance (5) ──────────────────────────────────────────────────────────
    {
      title: 'Tax Consultant',
      description: 'Brussels Big 4 affiliate is hiring a Tax Consultant to advise multinational clients on European VAT and corporate tax matters.',
      requirements: '2+ years tax consulting. Belgian or EU tax knowledge. CPA or local equivalent preferred. Detail-oriented.',
      responsibilities: 'Prepare and review tax filings. Advise clients on tax planning. Research regulatory changes. Support transfer pricing work.',
      benefits: 'Hybrid work. Clear career path. Training and certification support. International exposure.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Belgium', city: 'Brussels',
      salaryMin: 50000, salaryMax: 70000, salaryCurrency: 'EUR',
      category: 'finance', skillNames: ['SQL'],
      employerIdx: 3, vacanciesCount: 1, requiredLanguages: ['English', 'French', 'Dutch'],
      tags: ['tax', 'consulting', 'vat'],
    },
    {
      title: 'Treasury Analyst',
      description: 'The Hague-based multinational is seeking a Treasury Analyst to manage cash positioning, FX hedging, and banking relationships.',
      requirements: '2+ years treasury experience. Excel modelling skills. Understanding of FX and interest rate hedging. CTP certification a plus.',
      responsibilities: 'Monitor daily cash positions. Execute FX trades. Maintain banking documentation. Prepare treasury reports.',
      benefits: 'Hybrid work. 25 days leave. Pension. Profit sharing.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.OFFICE, country: 'Netherlands', city: 'The Hague',
      salaryMin: 55000, salaryMax: 70000, salaryCurrency: 'EUR',
      category: 'finance', skillNames: ['SQL'],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['English', 'Dutch'],
      tags: ['treasury', 'fx', 'corporate-finance'],
    },
    {
      title: 'Venture Capital Analyst',
      description: 'Copenhagen VC firm investing in Nordic deep tech and climate startups is hiring a junior analyst to support deal flow and portfolio management.',
      requirements: 'Finance or engineering degree. Strong analytical skills. Interest in startups and innovation. Excel and PowerPoint proficiency.',
      responsibilities: 'Screen investment opportunities. Build financial models. Conduct market research. Support portfolio monitoring.',
      benefits: 'Unique entry into VC. Mentoring from partners. Startup ecosystem access. Competitive salary.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.HYBRID, country: 'Denmark', city: 'Copenhagen',
      salaryMin: 500000, salaryMax: 650000, salaryCurrency: 'DKK',
      category: 'finance', skillNames: ['Python', 'SQL'],
      employerIdx: 3, vacanciesCount: 1, requiredLanguages: ['English', 'Danish'],
      tags: ['venture-capital', 'startups', 'analyst'],
    },
    {
      title: 'Financial Controller',
      description: 'Buenos Aires subsidiary of a European manufacturing group is seeking a Financial Controller to oversee local finance operations and group reporting.',
      requirements: '5+ years finance experience. IFRS knowledge. Hyperion or SAP experience. Spanish and English fluency.',
      responsibilities: 'Lead month-end close. Prepare group reporting package. Manage local statutory filings. Coordinate external audit.',
      benefits: 'Competitive peso + USD bonus. Private health plan. Company car. Annual review.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Argentina', city: 'Buenos Aires',
      salaryMin: 5000000, salaryMax: 7000000, salaryCurrency: 'ARS',
      category: 'finance', skillNames: ['SQL'],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['Spanish', 'English'],
      tags: ['controller', 'ifrs', 'manufacturing'],
    },
    {
      title: 'Accounts Payable Specialist',
      description: 'Bucharest shared service center of a global retail chain is expanding the AP team. Entry-level role with structured training.',
      requirements: 'Accounting or finance degree. Basic Excel skills. Attention to detail. English B2+. SAP knowledge a plus.',
      responsibilities: 'Process supplier invoices. Reconcile AP ledger. Handle payment runs. Respond to supplier queries.',
      benefits: 'Office work. Meal vouchers. Private healthcare. Transport allowance. Growth opportunities.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.INTERN,
      workFormat: WorkFormat.OFFICE, country: 'Romania', city: 'Bucharest',
      salaryMin: 5000, salaryMax: 7000, salaryCurrency: 'RON',
      category: 'finance', skillNames: ['SQL'],
      employerIdx: 1, vacanciesCount: 3, requiredLanguages: ['Romanian', 'English'],
      tags: ['accounts-payable', 'shared-services', 'finance'],
    },

    // ── Education (5) ────────────────────────────────────────────────────────
    {
      title: 'STEM Teacher (Secondary School)',
      description: 'Auckland international school is recruiting an enthusiastic STEM Teacher to deliver interdisciplinary science and technology classes to Years 9–13.',
      requirements: 'Teaching qualification (NZ or equivalent). STEM subject background. NZ or Australian work eligibility. Passion for project-based learning.',
      responsibilities: 'Design and deliver STEM lessons. Coordinate science fair events. Support student career exploration. Collaborate with cross-subject team.',
      benefits: 'Competitive NZ teacher salary. Paid school holidays. Professional development. Community school environment.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.OFFICE, country: 'New Zealand', city: 'Auckland',
      salaryMin: 70000, salaryMax: 90000, salaryCurrency: 'NZD',
      category: 'education', skillNames: [],
      employerIdx: 0, vacanciesCount: 2, requiredLanguages: ['English'],
      tags: ['stem', 'teaching', 'secondary'],
    },
    {
      title: 'Educational Psychologist',
      description: 'Oslo municipality is seeking an Educational Psychologist to support schools in identifying and addressing learning difficulties and special educational needs.',
      requirements: 'Masters in Educational or Clinical Psychology. Authorisation from Norwegian Health Personnel. Strong communication with children and families.',
      responsibilities: 'Conduct psychoeducational assessments. Advise teachers and parents. Develop individual learning plans. Provide consultative support.',
      benefits: 'Public sector employment. 5 weeks vacation. Generous pension. Flexible hours.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Norway', city: 'Oslo',
      salaryMin: 700000, salaryMax: 850000, salaryCurrency: 'NOK',
      category: 'education', skillNames: [],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['Norwegian', 'English'],
      tags: ['psychology', 'special-needs', 'schools'],
    },
    {
      title: 'K-12 Curriculum Designer',
      description: 'São Paulo EdTech company is hiring a Curriculum Designer to develop STEM and critical thinking curricula for Brazilian K-12 schools.',
      requirements: '3+ years curriculum development. Experience with K-12 education. Instructional design knowledge. Portuguese native. English B2+.',
      responsibilities: 'Research and design curricula. Collaborate with teachers and subject experts. Adapt content for different age groups. Evaluate learning outcomes.',
      benefits: 'Remote work. Flexible schedule. Company-wide access to learning platform. Impact on thousands of students.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.REMOTE, country: 'Brazil', city: 'São Paulo',
      salaryMin: 7000, salaryMax: 12000, salaryCurrency: 'BRL',
      category: 'education', skillNames: [],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['Portuguese', 'English'],
      tags: ['curriculum', 'k-12', 'edtech'],
    },
    {
      title: 'University Lecturer in Computer Science',
      description: 'Helsinki university is seeking a Lecturer in Computer Science to teach undergraduate courses in algorithms, data structures, and software engineering.',
      requirements: 'PhD in CS or related field (or near completion). Teaching experience preferred. Research interests in software engineering or AI.',
      responsibilities: 'Deliver lectures and labs. Supervise student projects and theses. Participate in departmental research. Contribute to curriculum development.',
      benefits: 'Academic tenure track. 6 weeks summer leave. Research budget. International conference travel.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Finland', city: 'Helsinki',
      salaryMin: 55000, salaryMax: 70000, salaryCurrency: 'EUR',
      category: 'education', skillNames: ['Python', 'SQL', 'Git'],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['English', 'Finnish'],
      tags: ['academia', 'computer-science', 'university'],
    },
    {
      title: 'Language School Academic Director',
      description: 'Istanbul private language school is seeking an Academic Director to lead a team of 30 language teachers and oversee educational standards.',
      requirements: '7+ years EFL/ESL management. DELTA or MA in Applied Linguistics. Leadership experience. Turkish a plus.',
      responsibilities: 'Set and monitor academic standards. Recruit and develop teachers. Design curriculum. Liaise with parents and students.',
      benefits: 'Competitive salary. Housing allowance. Health insurance. Annual flights home.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.LEAD,
      workFormat: WorkFormat.OFFICE, country: 'Turkey', city: 'Istanbul',
      salaryMin: 120000, salaryMax: 180000, salaryCurrency: 'TRY',
      category: 'education', skillNames: [],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['English', 'Turkish'],
      tags: ['academic-management', 'efl', 'leadership'],
    },

    // ── Medicine (5) ─────────────────────────────────────────────────────────
    {
      title: 'Telemedicine Physician',
      description: 'Mexico City health platform is hiring remote Physicians to provide teleconsultations in internal medicine to patients across Mexico and Central America.',
      requirements: 'Medical degree and licence. 3+ years clinical experience. Comfortable with telehealth platforms. Spanish native, English B2.',
      responsibilities: 'Conduct video and chat consultations. Prescribe treatment plans. Maintain digital patient records. Refer to specialists when needed.',
      benefits: 'Fully remote. Flexible scheduling. Competitive fee per consultation. Malpractice insurance provided.',
      jobType: JobType.PART_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.REMOTE, country: 'Mexico', city: 'Mexico City',
      salaryMin: 30000, salaryMax: 60000, salaryCurrency: 'MXN',
      category: 'medicine', skillNames: [],
      employerIdx: 2, vacanciesCount: 5, requiredLanguages: ['Spanish', 'English'],
      tags: ['telemedicine', 'remote', 'physician'],
    },
    {
      title: 'Medical Devices QA Engineer',
      description: 'Galway medtech company is hiring a QA Engineer to ensure quality compliance for Class II medical devices in accordance with EU MDR and FDA requirements.',
      requirements: '3+ years QA in medical devices. EU MDR and ISO 13485 knowledge. Risk management experience. Detail-oriented.',
      responsibilities: 'Maintain quality management system. Conduct audits. Review design documentation. Manage non-conformances. Support regulatory submissions.',
      benefits: 'Hybrid work. Private healthcare. 23 days leave. Pension.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Ireland', city: 'Galway',
      salaryMin: 55000, salaryMax: 72000, salaryCurrency: 'EUR',
      category: 'medicine', skillNames: [],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['medtech', 'qa', 'regulatory'],
    },
    {
      title: 'Radiologist',
      description: 'Cluj-Napoca private clinic group is seeking a Radiologist to read diagnostic imaging studies across CT, MRI, and X-ray for multiple clinic locations.',
      requirements: 'MD with radiology specialisation. Romanian medical licence. Experience with PACS systems. Excellent diagnostic accuracy.',
      responsibilities: 'Interpret imaging studies. Issue timely diagnostic reports. Consult with referring physicians. Participate in multidisciplinary meetings.',
      benefits: 'Competitive salary. Private pension. Health insurance. Modern equipment. Relocation support.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.OFFICE, country: 'Romania', city: 'Cluj-Napoca',
      salaryMin: 30000, salaryMax: 45000, salaryCurrency: 'RON',
      category: 'medicine', skillNames: [],
      employerIdx: 3, vacanciesCount: 2, requiredLanguages: ['Romanian', 'English'],
      tags: ['radiology', 'diagnostic', 'imaging'],
    },
    {
      title: 'Mental Health Counselor',
      description: 'Wellington community health service is looking for a Counselor to provide individual and group therapy for adults experiencing anxiety, depression, and trauma.',
      requirements: 'Master in Counselling or Clinical Psychology. NZAC registration. 2+ years post-qualification experience. Cultural competency.',
      responsibilities: 'Provide individual and group counselling sessions. Develop treatment plans. Maintain clinical records. Liaise with community partners.',
      benefits: 'Hybrid work. Clinical supervision provided. 5 weeks leave. Pension contributions.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'New Zealand', city: 'Wellington',
      salaryMin: 75000, salaryMax: 95000, salaryCurrency: 'NZD',
      category: 'medicine', skillNames: [],
      employerIdx: 0, vacanciesCount: 2, requiredLanguages: ['English'],
      tags: ['counselling', 'mental-health', 'community'],
    },
    {
      title: 'Biotech Research Scientist',
      description: 'Copenhagen biotech company is hiring a Research Scientist to lead early-stage drug discovery research in the field of immuno-oncology.',
      requirements: 'PhD in Biochemistry, Molecular Biology, or related. 2+ years post-doctoral or industry research. Cell biology assay experience.',
      responsibilities: 'Design and conduct in vitro experiments. Analyse results and prepare reports. Present findings to scientific leadership. Publish research.',
      benefits: 'Competitive researcher salary. ESOP. State-of-the-art laboratory. Danish work-life balance.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.OFFICE, country: 'Denmark', city: 'Copenhagen',
      salaryMin: 650000, salaryMax: 820000, salaryCurrency: 'DKK',
      category: 'medicine', skillNames: ['Python', 'SQL'],
      employerIdx: 3, vacanciesCount: 1, requiredLanguages: ['English', 'Danish'],
      tags: ['biotech', 'drug-discovery', 'oncology'],
    },

    // ── Law (4) ──────────────────────────────────────────────────────────────
    {
      title: 'Immigration Lawyer',
      description: 'Montreal full-service law firm is seeking an Immigration Lawyer to handle skilled worker, family reunification, and refugee cases.',
      requirements: 'Quebec bar admission. 3+ years immigration law practice. French and English bilingualism. Empathetic and client-focused.',
      responsibilities: 'Advise clients on immigration pathways. Prepare and file applications. Represent clients before IRCC and IRB. Stay current on regulatory changes.',
      benefits: 'Competitive salary + billing bonus. Health and dental. Pension. Flexible hybrid schedule.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Canada', city: 'Montreal',
      salaryMin: 90000, salaryMax: 120000, salaryCurrency: 'CAD',
      category: 'law', skillNames: [],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['French', 'English'],
      tags: ['immigration', 'law', 'canada'],
    },
    {
      title: 'Intellectual Property Attorney',
      description: 'Tokyo IP boutique law firm is seeking an Attorney specializing in patent prosecution and IP litigation for technology and electronics clients.',
      requirements: 'Japanese bar qualification or registered patent attorney. Technical background (engineering/science). Japanese and English fluency.',
      responsibilities: 'Draft and prosecute patent applications. Advise on IP strategy. Handle oppositions and disputes. Support licensing negotiations.',
      benefits: 'Prestigious firm. High base salary. Annual bonus. International client exposure.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.OFFICE, country: 'Japan', city: 'Tokyo',
      salaryMin: 12000000, salaryMax: 18000000, salaryCurrency: 'JPY',
      category: 'law', skillNames: [],
      employerIdx: 4, vacanciesCount: 1, requiredLanguages: ['Japanese', 'English'],
      tags: ['ip', 'patent', 'technology-law'],
    },
    {
      title: 'Labor Law Specialist',
      description: 'Buenos Aires law firm is seeking a Labor Law Specialist to advise multinational clients on Argentine employment regulations and labor disputes.',
      requirements: '4+ years labor law experience in Argentina. Bar admission. Spanish native. English professional level.',
      responsibilities: 'Advise on employment contracts and terminations. Represent clients in labor proceedings. Draft internal policies. Training for HR teams.',
      benefits: 'Hybrid work. Market salary. Health insurance. Ongoing legal training.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Argentina', city: 'Buenos Aires',
      salaryMin: 3000000, salaryMax: 5000000, salaryCurrency: 'ARS',
      category: 'law', skillNames: [],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['Spanish', 'English'],
      tags: ['labor-law', 'employment', 'argentina'],
    },
    {
      title: 'Data Privacy Lawyer (GDPR)',
      description: 'Brussels EU institution is hiring a Data Privacy Lawyer to ensure compliance with GDPR and assist with regulatory consultations on AI and digital policy.',
      requirements: '5+ years privacy law experience. Deep GDPR expertise. CIPP/E certification preferred. Excellent legal writing in English.',
      responsibilities: 'Advise on GDPR compliance. Review data processing agreements. Represent in regulatory consultations. Develop privacy policies.',
      benefits: 'EU institution working conditions. Excellent pension. International environment. Mission-driven role.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Belgium', city: 'Brussels',
      salaryMin: 90000, salaryMax: 120000, salaryCurrency: 'EUR',
      category: 'law', skillNames: [],
      employerIdx: 3, vacanciesCount: 1, requiredLanguages: ['English', 'French'],
      tags: ['gdpr', 'privacy', 'eu'],
    },

    // ── Logistics (4) ────────────────────────────────────────────────────────
    {
      title: 'Last-Mile Delivery Manager',
      description: 'Johannesburg e-commerce company is hiring a Last-Mile Delivery Manager to build and optimize their delivery network across Gauteng province.',
      requirements: '4+ years logistics management. Last-mile delivery experience. People management skills. Route optimization knowledge.',
      responsibilities: 'Manage fleet of delivery partners. Optimize delivery routes. Track KPIs and SLAs. Resolve delivery escalations. Grow the partner network.',
      benefits: 'Competitive package. Fuel allowance. Performance bonus. Fast-growing startup environment.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.OFFICE, country: 'South Africa', city: 'Johannesburg',
      salaryMin: 550000, salaryMax: 750000, salaryCurrency: 'ZAR',
      category: 'logistics', skillNames: [],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['last-mile', 'delivery', 'ecommerce'],
    },
    {
      title: 'Cold Chain Logistics Specialist',
      description: 'Oslo pharmaceutical distributor is seeking a Cold Chain Specialist to ensure compliant temperature-controlled transport of medicines across Scandinavia.',
      requirements: '3+ years cold chain experience. GDP/GMP knowledge. Experience with monitoring systems. Attention to compliance.',
      responsibilities: 'Manage cold chain operations. Conduct temperature deviation investigations. Audit logistics partners. Prepare SOP documentation.',
      benefits: 'Hybrid work. 25 days leave. Health insurance. Stable publicly funded company.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Norway', city: 'Oslo',
      salaryMin: 600000, salaryMax: 750000, salaryCurrency: 'NOK',
      category: 'logistics', skillNames: [],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['English', 'Norwegian'],
      tags: ['cold-chain', 'pharma', 'compliance'],
    },
    {
      title: 'Port Operations Coordinator',
      description: 'Lisbon port authority is recruiting an Operations Coordinator to manage vessel scheduling, cargo handling, and coordination with shipping agents.',
      requirements: '2+ years port or shipping experience. Portuguese native. English B2+. IMDG/customs knowledge preferred.',
      responsibilities: 'Schedule vessel arrivals and departures. Coordinate with stevedores and agents. Track cargo movements. Handle documentation.',
      benefits: 'Stable government-linked employer. 25 days leave. Pension. Training opportunities.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.OFFICE, country: 'Portugal', city: 'Lisbon',
      salaryMin: 22000, salaryMax: 30000, salaryCurrency: 'EUR',
      category: 'logistics', skillNames: [],
      employerIdx: 1, vacanciesCount: 2, requiredLanguages: ['Portuguese', 'English'],
      tags: ['port', 'shipping', 'maritime'],
    },
    {
      title: 'E-commerce Fulfilment Analyst',
      description: 'Mumbai logistics startup is hiring a Fulfilment Analyst to monitor warehouse performance and identify bottlenecks across their 8 fulfilment centres.',
      requirements: '1+ year in operations or logistics. Excel proficiency. Analytical mindset. SQL basics a strong plus.',
      responsibilities: 'Analyse fulfilment metrics. Build dashboards. Identify process improvement opportunities. Report to operations lead.',
      benefits: 'Hybrid work. Health insurance. ESOP for early team. High-growth startup.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.JUNIOR,
      workFormat: WorkFormat.HYBRID, country: 'India', city: 'Mumbai',
      salaryMin: 600000, salaryMax: 1000000, salaryCurrency: 'INR',
      category: 'logistics', skillNames: ['SQL'],
      employerIdx: 3, vacanciesCount: 2, requiredLanguages: ['English', 'Hindi'],
      tags: ['ecommerce', 'fulfilment', 'analytics'],
    },

    // ── Sales (4) ────────────────────────────────────────────────────────────
    {
      title: 'Partnership Manager',
      description: 'Dublin European HQ of a US tech company is hiring a Partnership Manager to develop and grow strategic alliances across EMEA.',
      requirements: '4+ years partner or channel sales. Technology sector experience. Relationship building skills. CRM proficiency.',
      responsibilities: 'Identify and onboard new partners. Enable partner sales teams. Co-develop joint go-to-market plans. Report on partner pipeline.',
      benefits: 'Hybrid. 23 days leave. RSUs. Company-wide bonus. International travel.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Ireland', city: 'Dublin',
      salaryMin: 70000, salaryMax: 90000, salaryCurrency: 'EUR',
      category: 'sales', skillNames: [],
      employerIdx: 1, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['partnerships', 'channel', 'emea'],
    },
    {
      title: 'Key Account Manager',
      description: 'São Paulo subsidiary of a European industrial group is seeking a KAM to manage relationships with top 20 manufacturing clients in Brazil.',
      requirements: '5+ years B2B account management. Industrial or manufacturing sector knowledge. Spanish or Portuguese native. Technical aptitude.',
      responsibilities: 'Own revenue for key accounts. Identify upsell opportunities. Coordinate with technical teams. Present business reviews.',
      benefits: 'Base + commission + car allowance. Health plan. 15 days leave. Stable multinational.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'Brazil', city: 'São Paulo',
      salaryMin: 15000, salaryMax: 25000, salaryCurrency: 'BRL',
      category: 'sales', skillNames: [],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['Portuguese', 'English'],
      tags: ['key-account', 'b2b', 'manufacturing'],
    },
    {
      title: 'Channel Sales Manager',
      description: 'Bangalore software company seeks a Channel Sales Manager to recruit and enable a network of VAR and system integrator partners across South India.',
      requirements: '4+ years channel sales. IT software distribution experience. Telugu or Tamil a plus. Strong partner enablement skills.',
      responsibilities: 'Recruit reseller partners. Train partner sales teams. Support partner-led deals. Manage MDF budgets.',
      benefits: 'Office in Bangalore. Medical insurance. Provident fund. Annual incentive trip.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.OFFICE, country: 'India', city: 'Bangalore',
      salaryMin: 1200000, salaryMax: 1800000, salaryCurrency: 'INR',
      category: 'sales', skillNames: [],
      employerIdx: 4, vacanciesCount: 1, requiredLanguages: ['English', 'Hindi'],
      tags: ['channel', 'var', 'it-sales'],
    },
    {
      title: 'Sales Engineer',
      description: 'Helsinki industrial automation company is seeking a Sales Engineer to support technical sales of robotics and automation solutions to Finnish manufacturers.',
      requirements: '3+ years technical sales or pre-sales. Engineering background (mechanical or electrical). Finnish and English fluency.',
      responsibilities: 'Provide technical support to sales team. Demo automation solutions. Scope technical requirements. Prepare proposals.',
      benefits: 'Hybrid work. Company car. 5 weeks leave. Profit sharing. Annual technology trips.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Finland', city: 'Helsinki',
      salaryMin: 60000, salaryMax: 78000, salaryCurrency: 'EUR',
      category: 'sales', skillNames: [],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['Finnish', 'English'],
      tags: ['pre-sales', 'robotics', 'automation'],
    },

    // ── HR (3) ───────────────────────────────────────────────────────────────
    {
      title: 'Chief People Officer',
      description: 'Oslo clean-tech unicorn is hiring its first CPO to build a world-class people function and culture to support rapid global expansion.',
      requirements: '12+ years in HR with 5+ years at CPO/VP level. Experience scaling organizations from 200 to 1000+. Global team experience.',
      responsibilities: 'Own people strategy. Build HR team. Design compensation philosophy. Lead diversity and inclusion initiatives. Partner with CEO and board.',
      benefits: 'Executive package. Significant ESOP. Relocation support. Mission-driven company.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.EXECUTIVE,
      workFormat: WorkFormat.HYBRID, country: 'Norway', city: 'Oslo',
      salaryMin: 1500000, salaryMax: 2000000, salaryCurrency: 'NOK',
      category: 'hr', skillNames: [],
      employerIdx: 0, vacanciesCount: 1, requiredLanguages: ['English', 'Norwegian'],
      tags: ['cpo', 'people-leadership', 'scale-up'],
    },
    {
      title: 'Learning & Development Manager',
      description: 'Cape Town financial services group is looking for an L&D Manager to design and deliver capability building programs for 800 employees.',
      requirements: '5+ years L&D experience in financial services. Instructional design skills. Facilitation expertise. LMS platform management.',
      responsibilities: 'Design learning programmes. Manage external training vendors. Run leadership development initiatives. Measure learning effectiveness.',
      benefits: 'Hybrid work. Medical aid. Retirement fund. 20 days leave. Study assistance.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.SENIOR,
      workFormat: WorkFormat.HYBRID, country: 'South Africa', city: 'Cape Town',
      salaryMin: 700000, salaryMax: 900000, salaryCurrency: 'ZAR',
      category: 'hr', skillNames: [],
      employerIdx: 2, vacanciesCount: 1, requiredLanguages: ['English'],
      tags: ['learning', 'development', 'financial-services'],
    },
    {
      title: 'Compensation & Benefits Specialist',
      description: 'Brussels European headquarters of a US tech giant is seeking a C&B Specialist to manage total rewards programs for 1,200 EMEA employees.',
      requirements: '3+ years compensation and benefits experience. Advanced Excel and HR analytics skills. Knowledge of European employment regulations.',
      responsibilities: 'Conduct salary benchmarking. Administer benefit plans. Support annual pay review. Partner with HRBP team.',
      benefits: 'Competitive package including RSUs. 25 days leave. Canteen subsidy. Excellent benefits package.',
      jobType: JobType.FULL_TIME, experienceLevel: ExperienceLevel.MIDDLE,
      workFormat: WorkFormat.HYBRID, country: 'Belgium', city: 'Brussels',
      salaryMin: 65000, salaryMax: 82000, salaryCurrency: 'EUR',
      category: 'hr', skillNames: ['SQL'],
      employerIdx: 3, vacanciesCount: 1, requiredLanguages: ['English', 'French'],
      tags: ['compensation', 'benefits', 'emea'],
    },
  ];

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 3);

  for (const def of JOBS) {
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
      salaryMin: def.salaryMin,
      salaryMax: def.salaryMax,
      salaryCurrency: def.salaryCurrency,
      isSalaryNegotiable: def.isSalaryNegotiable ?? false,
      category: def.category,
      requiredSkills: skills(...def.skillNames),
      employer: emp(def.employerIdx),
      employerId: emp(def.employerIdx).id,
      vacanciesCount: def.vacanciesCount ?? 1,
      requiredLanguages: def.requiredLanguages,
      tags: def.tags,
      isRemote: def.workFormat === WorkFormat.REMOTE,
      publishedAt: new Date(),
      applicationDeadline: deadline,
    });

    await jobRepo.save(job);
    process.stdout.write('.');
  }

  console.log(`\n✅ Inserted ${JOBS.length} jobs`);

  await DB.query(`
    UPDATE jobs
    SET "createdAt" = NOW() - (random() * INTERVAL '365 days')
    WHERE "publishedAt" > NOW() - INTERVAL '1 hour'
  `);
  console.log('📅 Spread createdAt across the last year');

  await DB.destroy();
  console.log('✅ Done');
}

main().catch(err => { console.error(err); process.exit(1); });
