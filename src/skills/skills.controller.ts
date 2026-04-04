import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateSkillDto } from './dto/create-skill.dto';       // ← додати
import { CreateCategoryDto } from './dto/create-category.dto';
@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new skill (admin only)' })
  createSkill(@Body() createSkillDto: CreateSkillDto) {
    return this.skillsService.createSkill(createSkillDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all skills' })
  findAllSkills(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.skillsService.findAllSkills(search, categoryId);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular skills' })
  getPopularSkills(@Query('limit') limit: number = 20) {
    return this.skillsService.getPopularSkills(limit);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all skill categories' })
  findAllCategories() {
    return this.skillsService.findAllCategories();
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create skill category (admin only)' })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.skillsService.createCategory(
      createCategoryDto.name,
      createCategoryDto.icon,
    );
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get skill category by ID' })
  findCategoryById(@Param('id') id: string) {
    return this.skillsService.findCategoryById(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get skill by ID' })
  findSkillById(@Param('id') id: string) {
    return this.skillsService.findSkillById(id);
  }
}