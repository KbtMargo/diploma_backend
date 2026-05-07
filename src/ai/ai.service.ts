import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Application } from '../applications/entities/application.entity';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(Application)
    private applicationsRepo: Repository<Application>,
    configService: ConfigService,
  ) {
    this.genAI = new GoogleGenerativeAI(configService.get('GEMINI_API_KEY'));
  }

  async analyzeApplication(applicationId: string, employerId: string) {
    const application = await this.applicationsRepo.findOne({
      where: { id: applicationId },
      relations: ['applicant', 'applicant.skills', 'job', 'job.requiredSkills'],
    });

    if (!application) throw new NotFoundException('Заявку не знайдено');
    if (application.job.employerId !== employerId) throw new ForbiddenException();

    const candidate = application.applicant;
    const job = application.job;

    const candidateProfile = {
      name: `${candidate.firstName} ${candidate.lastName}`,
      summary: candidate.summary || null,
      skills: candidate.skills?.map((s) => s.name) ?? [],
      education: candidate.education ?? [],
      workExperience: candidate.workExperience ?? [],
      languages: candidate.languages ?? [],
      country: candidate.country || null,
      city: candidate.city || null,
      coverLetter: application.coverLetter || null,
    };

    const jobRequirements = {
      title: job.title,
      description: job.description,
      requirements: job.requirements || null,
      experienceLevel: job.experienceLevel,
      jobType: job.jobType,
      requiredSkills: job.requiredSkills?.map((s) => s.name) ?? [],
    };

    const prompt = `You are an expert HR assistant. Analyze whether this candidate matches the job requirements.

JOB:
${JSON.stringify(jobRequirements, null, 2)}

CANDIDATE:
${JSON.stringify(candidateProfile, null, 2)}

Respond ONLY with a valid JSON object (no markdown fences, no extra text):
{
  "score": <integer 0-100 representing overall match percentage>,
  "recommendation": <one of: "strong_yes", "yes", "maybe", "no">,
  "strengths": [<2-4 specific strengths of this candidate for this role, in Ukrainian>],
  "gaps": [<0-3 missing or weak areas, in Ukrainian; empty array if none>],
  "summary": <2-3 sentence overall assessment in Ukrainian>
}`;

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Не вдалося розібрати відповідь AI');
    const analysis = JSON.parse(jsonMatch[0]);

    await this.applicationsRepo.update(applicationId, {
      aiAnalysis: analysis,
      aiAnalyzedAt: new Date(),
    });

    return { applicationId, analyzedAt: new Date(), ...analysis };
  }

  async analyzeJobApplications(jobId: string, employerId: string) {
    const applications = await this.applicationsRepo.find({
      where: { jobId },
      relations: ['applicant', 'applicant.skills', 'job', 'job.requiredSkills'],
    });

    if (applications.length === 0) {
      return { jobId, analyzed: 0, failed: 0, results: [] };
    }

    if (applications[0].job.employerId !== employerId) {
      throw new ForbiddenException();
    }

    let analyzed = 0;
    let failed = 0;
    const results: any[] = [];

    for (const app of applications) {
      if (app.aiAnalysis) {
        results.push({ applicationId: app.id, analyzedAt: app.aiAnalyzedAt, ...app.aiAnalysis });
        analyzed++;
        continue;
      }

      try {
        const result = await this.analyzeApplication(app.id, employerId);
        results.push(result);
        analyzed++;
      } catch {
        failed++;
      }
    }

    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return { jobId, analyzed, failed, results };
  }
}
