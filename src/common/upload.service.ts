import { Injectable, BadRequestException } from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private writeFile(dest: string, file: Express.Multer.File): void {
    writeFileSync(dest, file.buffer);
  }

  saveAvatar(file: Express.Multer.File, userId: string): string {
    if (!file) throw new BadRequestException('No file provided');

    const dir = join(this.uploadDir, 'avatars');
    this.ensureDir(dir);

    const filename = `${userId}${extname(file.originalname)}`;
    const dest = join(dir, filename);

    if (existsSync(dest)) unlinkSync(dest);
    this.writeFile(dest, file);

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
    this.ensureDir(dir);

    const filename = `${userId}_${uuidv4()}${extname(file.originalname)}`;
    const dest = join(dir, filename);

    this.writeFile(dest, file);

    return `/uploads/resumes/${filename}`;
  }

  saveDocument(file: Express.Multer.File): string {
    if (!file) throw new BadRequestException('No file provided');

    const dir = join(this.uploadDir, 'documents');
    this.ensureDir(dir);

    const filename = `${uuidv4()}${extname(file.originalname)}`;
    const dest = join(dir, filename);

    this.writeFile(dest, file);

    return `/uploads/documents/${filename}`;
  }

  saveCompanyLogo(file: Express.Multer.File, companyId: string): string {
    if (!file) throw new BadRequestException('No file provided');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Дозволені формати: JPEG, PNG, WebP, SVG');
    }

    const dir = join(this.uploadDir, 'logos');
    this.ensureDir(dir);

    const filename = `${companyId}${extname(file.originalname)}`;
    const dest = join(dir, filename);

    if (existsSync(dest)) unlinkSync(dest);
    this.writeFile(dest, file);

    return `/uploads/logos/${filename}`;
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
    this.ensureDir(dir);

    const filename = `${userId}_${uuidv4()}${extname(file.originalname)}`;
    const dest = join(dir, filename);
    this.writeFile(dest, file);

    return `/uploads/portfolio/${filename}`;
  }

  deleteFile(filePath: string): void {
    const fullPath = join(process.cwd(), filePath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }
}
