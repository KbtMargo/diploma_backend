import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Skill } from 'src/skills/entities/skill.entity';
import { User } from './entities/user.entity';
import { UploadService } from 'src/common/upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Skill]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'temp');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp',
          'application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'), false);
      },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, UploadService],
  exports: [UsersService, UploadService],
})
export class UsersModule {}