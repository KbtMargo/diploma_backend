import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { CompanyReview } from './entities/company-review.entity';
import { Company } from './entities/company.entity';
import { UploadService } from '../common/upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyReview, User, Job]),
    BullModule.registerQueue({ name: 'companies' }),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => cb(null, join(process.cwd(), 'uploads', 'temp')),
        filename: (req, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Невірний тип файлу'), false);
      },
    }),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, UploadService],
  exports: [CompaniesService],
})
export class CompaniesModule {}