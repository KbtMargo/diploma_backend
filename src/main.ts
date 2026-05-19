import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express'; // ← додати
import { join } from 'path'; // ← додати
import { existsSync, mkdirSync } from 'fs'; // ← додати

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // ← тип змінити
  const configService = app.get(ConfigService);

  // Створити папки для завантажень якщо не існують
  ['uploads/temp', 'uploads/avatars', 'uploads/resumes', 'uploads/documents'].forEach(dir => {
    const fullPath = join(process.cwd(), dir);
    if (!existsSync(fullPath)) mkdirSync(fullPath, { recursive: true });
  });

app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
});

  // решта вашого коду без змін...
  const isDev = configService.get('NODE_ENV', 'development') !== 'production';
  const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: isDev
      ? true
      : (origin, callback) => {
          // Allow Vercel preview deployments and the main domain
          const allowed = [
            frontendUrl,
            /\.vercel\.app$/,
          ];
          if (!origin || allowed.some(p => typeof p === 'string' ? p === origin : p.test(origin))) {
            callback(null, origin || true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.reduce((acc, error) => {
          acc[error.property] = Object.values(error.constraints || {});
          return acc;
        }, {});
        return new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const config = new DocumentBuilder()
    .setTitle('Youth Job Platform API')
    .setDescription('API documentation for youth job and internship platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('jobs', 'Job management')
    .addTag('applications', 'Job applications')
    .addTag('companies', 'Company profiles')
    .addTag('skills', 'Skills management')
    .addTag('notifications', 'User notifications')
    .addTag('analytics', 'Platform analytics')
    .addTag('admin', 'Admin panel')
    .addTag('chat', 'Real-time messaging')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();