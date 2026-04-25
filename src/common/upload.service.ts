import { Injectable, BadRequestException } from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync, renameSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  saveAvatar(file: Express.Multer.File, userId: string): string {
    if (!file) throw new BadRequestException('No file provided');

    const dir = join(this.uploadDir, 'avatars');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filename = `${userId}${extname(file.originalname)}`;
    const dest = join(dir, filename);

    if (existsSync(dest)) unlinkSync(dest); // видалити старий
    renameSync(file.path, dest);

    return `/uploads/avatars/${filename}`;
  }

  saveResume(file: Express.Multer.File, userId: string): string {
    if (!file) throw new BadRequestException('No file provided');

    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Word documents are allowed');
    }

    const dir = join(this.uploadDir, 'resumes');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filename = `${userId}_${uuidv4()}${extname(file.originalname)}`;
    const dest = join(dir, filename);

    renameSync(file.path, dest);

    return `/uploads/resumes/${filename}`;
  }

  saveDocument(file: Express.Multer.File): string {
    if (!file) throw new BadRequestException('No file provided');

    const dir = join(this.uploadDir, 'documents');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filename = `${uuidv4()}${extname(file.originalname)}`;
    const dest = join(dir, filename);

    renameSync(file.path, dest);

    return `/uploads/documents/${filename}`;
  }

  savePortfolioFile(file: Express.Multer.File, userId: string): string {
    if (!file) throw new BadRequestException('No file provided');

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/zip',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Непідтримуваний формат файлу');
    }

    const dir = join(this.uploadDir, 'portfolio');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filename = `${userId}_${uuidv4()}${extname(file.originalname)}`;
    const dest = join(dir, filename);
    renameSync(file.path, dest);

    return `/uploads/portfolio/${filename}`;
  }

  deleteFile(filePath: string): void {
    const fullPath = join(process.cwd(), filePath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }
}