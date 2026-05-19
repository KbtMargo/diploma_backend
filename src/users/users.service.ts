import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Skill } from 'src/skills/entities/skill.entity';
import { Repository, In } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { UploadService } from 'src/common/upload.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class UsersService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.genAI = new GoogleGenerativeAI(this.configService.get('GEMINI_API_KEY'));
  }

  async findAll(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const query = this.userRepository.createQueryBuilder('user');

    if (filters?.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters?.search) {
      query.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.skills && filters.skills.length > 0) {
      query.innerJoin('user.skills', 'skill', 'skill.id IN (:...skills)', {
        skills: filters.skills,
      });
    }

    const [users, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['skills'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['skills'],
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.findById(userId);

    if (updateProfileDto.skillIds) {
      const skills = await this.skillRepository.findBy({
        id: In(updateProfileDto.skillIds),
      });
      user.skills = skills;
      delete updateProfileDto.skillIds;
    }

    Object.assign(user, updateProfileDto);
    await this.userRepository.save(user);

    const { password: _, ...result } = user;
    return result;
  }

  async updateResume(userId: string, updateResumeDto: UpdateResumeDto) {
    const user = await this.findById(userId);
    Object.assign(user, updateResumeDto);
    await this.userRepository.save(user);
    return this.getResume(userId);
  }

  async getResume(userId: string) {
    const user = await this.findById(userId);
    return {
      personalInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        country: user.country,
        city: user.city,
        dateOfBirth: user.dateOfBirth,
        summary: user.summary,
      },
      skills: user.skills,
      languages: user.languages,
      preferredCountries: user.preferredCountries,
      preferredJobTypes: user.preferredJobTypes,
      education: user.education,
      workExperience: user.workExperience,
      portfolio: user.portfolio,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const user = await this.findById(userId);
    const avatarUrl = this.uploadService.saveAvatar(file, userId);
    user.avatarUrl = avatarUrl;
    await this.userRepository.save(user);
    return { avatarUrl };
  }

  async uploadResume(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const user = await this.findById(userId);
    const resumeUrl = this.uploadService.saveResume(file, userId);
    user.resumeUrl = resumeUrl;
    await this.userRepository.save(user);
    return { resumeUrl };
  }

  async deleteResume(userId: string) {
    const user = await this.findById(userId);
    if (user.resumeUrl) {
      this.uploadService.deleteFile(user.resumeUrl);
      user.resumeUrl = null;
      await this.userRepository.save(user);
    }
    return { message: 'Resume deleted' };
  }

  async uploadPortfolioFile(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const fileUrl = this.uploadService.savePortfolioFile(file, userId);
    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
    return { fileUrl, fileType };
  }

  async toggleSavedJob(userId: string, jobId: string) {
    await this.findById(userId);
    return { message: 'Job saved successfully' };
  }

  async getSavedJobs(userId: string) {
    return [];
  }

  async deleteAccount(userId: string) {
    const user = await this.findById(userId);
    user.isActive = false;
    await this.userRepository.save(user);
    return { message: 'Account deactivated successfully' };
  }

  async getStatistics(userId: string) {
    return {
      totalApplications: 0,
      activeApplications: 0,
      savedJobs: 0,
      profileViews: 0,
    };
  }

  async parseResumeFile(file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('No PDF file provided');

    const prompt = `You are an expert HR system. Extract structured information from this resume PDF.
The resume may be in any language (Ukrainian, English, Polish, German, etc.) — preserve original content, do not translate.
Normalize all dates to YYYY-MM-DD. If only year known: YYYY-01-01. If year+month: YYYY-MM-01.
For ongoing positions with no end date, set "current": true and omit "endDate".
Extract each skill as a separate item. Only include fields actually present — never invent data.

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phoneNumber": "string",
  "country": "string",
  "city": "string",
  "summary": "professional summary text",
  "education": [
    { "institution": "string", "degree": "string", "field": "string", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "grade": "string", "description": "string" }
  ],
  "workExperience": [
    { "company": "string", "position": "string", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "current": false, "description": "string", "achievements": ["string"] }
  ],
  "skills": ["skill1", "skill2"],
  "languages": ["Language1", "Language2"]
}`;

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    let aiResult;
    try {
      aiResult = await model.generateContent([
        {
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: 'application/pdf',
          },
        },
        prompt,
      ]);
    } catch (err: any) {
      throw new BadRequestException(`AI error: ${err?.message ?? String(err)}`);
    }
    const responseText = aiResult.response.text().trim();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new BadRequestException('AI could not parse the resume');

    const extracted = JSON.parse(jsonMatch[0]);

    // Match extracted skill names to DB skills (case-insensitive)
    const extractedSkillNames: string[] = extracted.skills || [];
    const allSkills = await this.skillRepository.find({ select: ['id', 'name'] });
    const matchedSkills = allSkills.filter(s =>
      extractedSkillNames.some(name => name.toLowerCase() === s.name.toLowerCase()),
    );
    const matchedNames = new Set(matchedSkills.map(s => s.name.toLowerCase()));
    const unmatchedSkills = extractedSkillNames.filter(n => !matchedNames.has(n.toLowerCase()));

    return {
      ...extracted,
      matchedSkills: matchedSkills.map(s => ({ id: s.id, name: s.name })),
      unmatchedSkills,
    };
  }

  async searchCandidates(
    filters: { search?: string; country?: string; city?: string; skills?: string[]; languages?: string[] },
    page = 1,
    limit = 10,
  ) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.skills', 'skill')
      .where('user.role = :role', { role: UserRole.JOB_SEEKER })
      .andWhere('user.isActive = true');

    if (filters.search) {
      query.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.summary ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters.country) {
      query.andWhere('user.country ILIKE :country', { country: `%${filters.country}%` });
    }
    if (filters.city) {
      query.andWhere('user.city ILIKE :city', { city: `%${filters.city}%` });
    }
    if (filters.skills && filters.skills.length > 0) {
      query.andWhere('skill.id IN (:...skillIds)', { skillIds: filters.skills });
    }
    if (filters.languages && filters.languages.length > 0) {
      query.andWhere('user.languages && :languages::text[]', { languages: filters.languages });
    }

    const [users, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: users.map(({ password: _, ...rest }) => rest),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}