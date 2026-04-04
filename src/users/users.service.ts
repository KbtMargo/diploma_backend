import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Skill } from 'src/skills/entities/skill.entity';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { UploadService } from 'src/common/upload.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    private readonly uploadService: UploadService,
  ) {}

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
}