import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { SkillCategory } from './entities/skill-category.entity';
import { CreateSkillDto } from './dto/create-skill.dto';       // ← додати
import { CreateCategoryDto } from './dto/create-category.dto';
@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(SkillCategory)
    private readonly categoryRepository: Repository<SkillCategory>,
  ) {}

  async createSkill(createSkillDto: CreateSkillDto): Promise<Skill> {
    const existing = await this.skillRepository.findOne({
      where: { name: ILike(createSkillDto.name) },
    });

    if (existing) {
      throw new ConflictException('Skill already exists');
    }

    const skill = this.skillRepository.create({
      ...createSkillDto,
      slug: this.generateSlug(createSkillDto.name),
    });

    return await this.skillRepository.save(skill);
  }

  async findAllSkills(search?: string, categoryId?: string): Promise<Skill[]> {
    const query = this.skillRepository.createQueryBuilder('skill');

    if (search) {
      query.where('skill.name ILIKE :search', { search: `%${search}%` });
    }

    if (categoryId) {
      query.andWhere('skill.categoryId = :categoryId', { categoryId });
    }

    return await query
      .leftJoinAndSelect('skill.category', 'category')
      .orderBy('skill.usageCount', 'DESC')
      .getMany();
  }

  async findSkillById(id: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async findTopSkills(limit: number = 50): Promise<Skill[]> {
    return await this.skillRepository.find({
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  async incrementUsage(skillId: string): Promise<void> {
    await this.skillRepository.increment({ id: skillId }, 'usageCount', 1);
  }

  async createCategory(name: string, icon?: string): Promise<SkillCategory> {
    const category = this.categoryRepository.create({ name, icon });
    return await this.categoryRepository.save(category);
  }

  async findAllCategories(): Promise<SkillCategory[]> {
    return await this.categoryRepository.find({
      relations: ['skills'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findCategoryById(id: string): Promise<SkillCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['skills'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async getPopularSkills(limit: number = 20): Promise<any[]> {
    return await this.skillRepository
      .createQueryBuilder('skill')
      .leftJoinAndSelect('skill.category', 'category')
      .orderBy('skill.usageCount', 'DESC')
      .take(limit)
      .getMany();
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}