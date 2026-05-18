import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Company, CompanyStatus, CompanySize } from './entities/company.entity';
import { CompanyReview } from './entities/company-review.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateCompanyDto } from './dto/create-company.dto';   // ← додати
import { UpdateCompanyDto } from './dto/update-company.dto';   // ← додати
import { CreateReviewDto } from './dto/create-review.dto'; 
@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyReview)
    private readonly reviewRepository: Repository<CompanyReview>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, ownerId: string): Promise<Company> {
    // Check if user already has a company
    const existingCompany = await this.companyRepository.findOne({
      where: { ownerId },
    });

    if (existingCompany) {
      throw new ConflictException('You already have a company profile');
    }

    // Check if company name is taken
    const nameExists = await this.companyRepository.findOne({
      where: { name: createCompanyDto.name },
    });

    if (nameExists) {
      throw new ConflictException('Company name is already taken');
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      ownerId,
      slug: this.generateSlug(createCompanyDto.name),
      status: CompanyStatus.PENDING,
    });

    const savedCompany = await this.companyRepository.save(company);

    // Update user role to employer if not already
    await this.userRepository.update(ownerId, { role: UserRole.EMPLOYER });

    return savedCompany;
  }

  async findAll(page: number = 1, limit: number = 10, filters?: any) {
    const p = Number(page) || 1;
    const l = Number(limit) || 10;
    const skip = (p - 1) * l;
    const query = this.companyRepository
      .createQueryBuilder('company')
      .where('company.status IN (:...statuses)', {
        statuses: [CompanyStatus.ACTIVE, CompanyStatus.VERIFIED],
      });

    if (filters?.search) {
      query.andWhere(
        '(company.name ILIKE :search OR company.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.industry) {
      query.andWhere('company.industry ILIKE :industry', { industry: filters.industry });
    }

    if (filters?.size) {
      query.andWhere('company.size = :size', { size: filters.size });
    }

    if (filters?.country) {
      query.andWhere("EXISTS (SELECT 1 FROM jsonb_array_elements(company.locations) AS loc WHERE loc->>'country' ILIKE :country)", {
        country: `%${filters.country}%`,
      });
    }

    const [companies, total] = await query
      .skip(skip)
      .take(l)
      .orderBy('company.rating', 'DESC')
      .addOrderBy('company.totalJobsPosted', 'DESC')
      .getManyAndCount();

    return {
      data: companies,
      meta: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['owner', 'jobs', 'reviews'],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    company.reviewsCount = company.reviews?.length ?? 0;
    company.totalJobsPosted = company.jobs?.length ?? 0;
    if (company.reviewsCount > 0) {
      const sum = company.reviews.reduce((acc, r) => acc + r.rating, 0);
      company.rating = Math.round((sum / company.reviewsCount) * 10) / 10;
    } else {
      company.rating = 0;
    }

    return company;
  }

  async findByOwner(ownerId: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { ownerId },
      relations: ['jobs'],
    });

    if (!company) {
      throw new NotFoundException('Company not found for this user');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, userId: string, userRole: string): Promise<Company> {
    const company = await this.findOne(id);

    // Check permissions
    if (userRole !== UserRole.ADMIN && company.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this company');
    }

    // Update slug if name changed
    if (updateCompanyDto.name && updateCompanyDto.name !== company.name) {
      const nameExists = await this.companyRepository.findOne({
        where: { name: updateCompanyDto.name },
      });
      if (nameExists && nameExists.id !== id) {
        throw new ConflictException('Company name is already taken');
      }
      updateCompanyDto['slug'] = this.generateSlug(updateCompanyDto.name);
    }

    Object.assign(company, updateCompanyDto);
    return await this.companyRepository.save(company);
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const company = await this.findOne(id);

    if (userRole !== UserRole.ADMIN && company.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this company');
    }

    await this.companyRepository.remove(company);
  }

  async addReview(companyId: string, createReviewDto: CreateReviewDto, userId: string): Promise<CompanyReview> {
    const company = await this.findOne(companyId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    // Check if user already reviewed this company
    const existingReview = await this.reviewRepository.findOne({
      where: { companyId, userId },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this company');
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      companyId,
      userId,
    });

    const savedReview = await this.reviewRepository.save(review);

    // Update company rating
    await this.updateCompanyRating(companyId);

    return savedReview;
  }

  async getReviews(companyId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { companyId },
      relations: ['user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: reviews,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateCompanyRating(companyId: string): Promise<void> {
    const reviews = await this.reviewRepository.find({
      where: { companyId },
    });

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    await this.companyRepository.update(companyId, {
      rating: avgRating,
      reviewsCount: reviews.length,
    });
  }

  async verifyCompany(id: string, adminId: string): Promise<Company> {
    const company = await this.findOne(id);
    company.isVerified = true;
    company.verifiedAt = new Date();
    company.verifiedBy = adminId;
    company.status = CompanyStatus.VERIFIED;
    return await this.companyRepository.save(company);
  }

  async getStatistics(companyId?: string) {
    if (companyId) {
      const company = await this.findOne(companyId);
      const reviews = await this.reviewRepository.find({
        where: { companyId },
      });

      const ratingDistribution = {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      };

      return {
        totalJobs: company.totalJobsPosted,
        totalReviews: company.reviewsCount,
        rating: company.rating,
        ratingDistribution,
        averageRatings: {
          workLifeBalance: reviews.reduce((sum, r) => sum + r.workLifeBalance, 0) / reviews.length || 0,
          salaryBenefits: reviews.reduce((sum, r) => sum + r.salaryBenefits, 0) / reviews.length || 0,
          careerOpportunities: reviews.reduce((sum, r) => sum + r.careerOpportunities, 0) / reviews.length || 0,
          management: reviews.reduce((sum, r) => sum + r.management, 0) / reviews.length || 0,
          culture: reviews.reduce((sum, r) => sum + r.culture, 0) / reviews.length || 0,
        },
      };
    }

    // Global statistics
    const totalCompanies = await this.companyRepository.count();
    const verifiedCompanies = await this.companyRepository.count({
      where: { isVerified: true },
    });
    const companiesByIndustry = await this.companyRepository
      .createQueryBuilder('company')
      .select('company.industry', 'industry')
      .addSelect('COUNT(*)', 'count')
      .groupBy('company.industry')
      .getRawMany();

    return {
      totalCompanies,
      verifiedCompanies,
      companiesByIndustry,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}