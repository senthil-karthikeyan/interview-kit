import crypto from 'crypto';
import { Types } from 'mongoose';
import type { LLMProvider } from '@interviewkit/ai';
import type {
  KitInput,
  Kit,
  PatchQuestionInput,
  AddQuestionInput,
  PatchFlashcardInput,
  AddFlashcardInput,
  PracticeRecordInput,
  QuestionCategory,
  Question,
  Flashcard,
} from '@interviewkit/schemas';
import { KitModel, type IKit } from './kit.model.js';
import { generateKitPipeline } from './kit.orchestrator.js';
import { AppError } from '../../middleware/error.middleware.js';
import { crawlCompanySite, type CrawledPage } from '../../services/crawler/crawler.service.js';
import { generateCompanyBrief } from '../research/research.service.js';
import { generateQuestionsForCategory } from '../generation/question.service.js';
import { allocateSchedule } from '../scheduling/schedule.service.js';

export function computeInputHash(input: KitInput): string {
  const normalized = {
    jd: input.jd.trim(),
    company_url: input.company_url.trim().toLowerCase(),
    days: input.days,
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export class KitService {
  /**
   * Starts async kit generation.
   * If a ready kit with identical input already exists for this user, returns it.
   */
  async createKit(userId: string, input: KitInput, llm: LLMProvider): Promise<IKit> {
    const inputHash = computeInputHash(input);

    // Reuse existing ready kit if available
    const existing = await KitModel.findOne({
      userId: new Types.ObjectId(userId),
      inputHash,
      status: 'ready',
    });
    if (existing) {
      return existing;
    }

    // Create a new pending record
    const kitDoc = await KitModel.create({
      userId: new Types.ObjectId(userId),
      status: 'pending',
      step: 'Queued',
      progress: 0,
      input,
      inputHash,
    });

    // Run pipeline asynchronously in background
    void (async () => {
      try {
        await KitModel.findByIdAndUpdate(kitDoc._id, { status: 'processing' });

        const kitData = await generateKitPipeline({
          input,
          llm,
          onProgress: async (step, progress) => {
            await KitModel.findByIdAndUpdate(kitDoc._id, { step, progress });
          },
        });

        await KitModel.findByIdAndUpdate(kitDoc._id, {
          status: 'ready',
          step: 'Complete',
          progress: 100,
          data: kitData,
        });
      } catch (err: unknown) {
        console.error(`[KitService] Generation failed for kit ${kitDoc._id.toString()}:`, err);
        const message = err instanceof Error ? err.message : 'Unknown generation error';
        await KitModel.findByIdAndUpdate(kitDoc._id, {
          status: 'failed',
          step: 'Failed',
          error: message,
        });
      }
    })();

    return kitDoc;
  }

  async getKit(userId: string, kitId: string): Promise<IKit> {
    if (!Types.ObjectId.isValid(kitId)) {
      throw new AppError(400, 'Invalid kit ID format', 'INVALID_ID');
    }
    const kit = await KitModel.findOne({
      _id: new Types.ObjectId(kitId),
      userId: new Types.ObjectId(userId),
    });
    if (!kit) {
      throw new AppError(404, 'Kit not found', 'KIT_NOT_FOUND');
    }
    return kit;
  }

  async listKits(userId: string): Promise<IKit[]> {
    return KitModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .select('status step progress input createdAt updatedAt data.role data.source');
  }

  async deleteKit(userId: string, kitId: string): Promise<void> {
    if (!Types.ObjectId.isValid(kitId)) {
      throw new AppError(400, 'Invalid kit ID format', 'INVALID_ID');
    }
    const res = await KitModel.deleteOne({
      _id: new Types.ObjectId(kitId),
      userId: new Types.ObjectId(userId),
    });
    if (res.deletedCount === 0) {
      throw new AppError(404, 'Kit not found', 'KIT_NOT_FOUND');
    }
  }

  // ── Question editing ──────────────────────────────────────────────────────────

  async updateQuestion(
    userId: string,
    kitId: string,
    questionId: string,
    patch: PatchQuestionInput,
  ): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready for editing', 'KIT_NOT_READY');

    const index = kit.data.questions.findIndex((q) => q.id === questionId);
    if (index === -1) throw new AppError(404, `Question ${questionId} not found`, 'NOT_FOUND');

    const existing = kit.data.questions[index];
    kit.data.questions[index] = {
      ...existing,
      ...patch,
      _state: patch._state ?? 'edited',
    };

    kit.markModified('data');
    await kit.save();
    return kit;
  }

  async addQuestion(
    userId: string,
    kitId: string,
    input: AddQuestionInput,
  ): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready for editing', 'KIT_NOT_READY');

    const newId = `q${kit.data.questions.length + 1}`;
    const newQuestion: Question = {
      id: newId,
      requirement_ids: input.requirement_ids,
      category: input.category,
      prompt: input.prompt,
      answer_outline: input.answer_outline,
      difficulty: input.difficulty,
      _state: 'edited',
    };

    kit.data.questions.push(newQuestion);
    kit.markModified('data');
    await kit.save();
    return kit;
  }

  async deleteQuestion(userId: string, kitId: string, questionId: string): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready for editing', 'KIT_NOT_READY');

    kit.data.questions = kit.data.questions.filter((q) => q.id !== questionId);
    kit.markModified('data');
    await kit.save();
    return kit;
  }

  // ── Flashcard editing ─────────────────────────────────────────────────────────

  async updateFlashcard(
    userId: string,
    kitId: string,
    flashcardId: string,
    patch: PatchFlashcardInput,
  ): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready for editing', 'KIT_NOT_READY');

    const index = kit.data.flashcards.findIndex((f) => f.id === flashcardId);
    if (index === -1) throw new AppError(404, `Flashcard ${flashcardId} not found`, 'NOT_FOUND');

    const existing = kit.data.flashcards[index];
    kit.data.flashcards[index] = {
      ...existing,
      ...patch,
      _state: patch._state ?? 'edited',
    };

    kit.markModified('data');
    await kit.save();
    return kit;
  }

  async addFlashcard(
    userId: string,
    kitId: string,
    input: AddFlashcardInput,
  ): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready for editing', 'KIT_NOT_READY');

    const newId = `f${kit.data.flashcards.length + 1}`;
    const newFlashcard: Flashcard = {
      id: newId,
      front: input.front,
      back: input.back,
      requirement_ids: input.requirement_ids,
      _state: 'edited',
    };

    kit.data.flashcards.push(newFlashcard);
    kit.markModified('data');
    await kit.save();
    return kit;
  }

  async deleteFlashcard(userId: string, kitId: string, flashcardId: string): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready for editing', 'KIT_NOT_READY');

    kit.data.flashcards = kit.data.flashcards.filter((f) => f.id !== flashcardId);
    kit.markModified('data');
    await kit.save();
    return kit;
  }

  // ── Practice recording ────────────────────────────────────────────────────────

  async recordPractice(
    userId: string,
    kitId: string,
    input: PracticeRecordInput,
  ): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    kit.practiceHistory.push({
      flashcard_id: input.flashcard_id,
      confidence: input.confidence,
      practiced_at: new Date(),
    });
    await kit.save();
    return kit;
  }

  // ── Regeneration with State Preservation ──────────────────────────────────────

  async regenerateCompanyBrief(
    userId: string,
    kitId: string,
    llm: LLMProvider,
  ): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready', 'KIT_NOT_READY');

    let crawledPages: CrawledPage[] = [];
    try {
      crawledPages = await crawlCompanySite(kit.data.source.company_url);
    } catch {
      // keep empty
    }

    const brief = await generateCompanyBrief(crawledPages, kit.data.source.company_url, llm);
    kit.data.company_brief = {
      summary: brief.summary,
      what_they_do: brief.what_they_do,
      sources: brief.sources,
    };

    kit.markModified('data');
    await kit.save();
    return kit;
  }

  async regenerateCategory(
    userId: string,
    kitId: string,
    category: QuestionCategory,
    llm: LLMProvider,
  ): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready', 'KIT_NOT_READY');

    // State preservation rule: preserve 'edited' and 'pinned' questions in this category!
    const preserved = kit.data.questions.filter(
      (q) => q.category === category && (q._state === 'edited' || q._state === 'pinned'),
    );
    const otherCategoryQuestions = kit.data.questions.filter((q) => q.category !== category);

    // Extraction context representation
    const extraction = {
      role_title: kit.data.role.title,
      seniority: kit.data.role.seniority,
      company: kit.data.source.company,
      location: kit.data.source.location ?? '',
      responsibilities: kit.data.role.responsibilities,
      requirements: kit.data.role.requirements,
    };

    const newQuestions = await generateQuestionsForCategory(
      category,
      extraction,
      kit.data.company_brief.summary,
      '',
      preserved.map((q) => q.id),
      llm,
    );

    const regenerated: Question[] = newQuestions.map((q) => ({
      ...q,
      _state: 'generated' as const,
    }));

    // Merge: other categories + preserved + regenerated
    kit.data.questions = [...otherCategoryQuestions, ...preserved, ...regenerated].map(
      (q, idx) => ({ ...q, id: `q${idx + 1}` }),
    );

    // Also update schedule with new questions
    kit.data.schedule = allocateSchedule(
      kit.data.questions,
      kit.data.role.requirements,
      kit.data.schedule.days_available,
    );

    kit.markModified('data');
    await kit.save();
    return kit;
  }

  async regenerateSchedule(userId: string, kitId: string): Promise<IKit> {
    const kit = await this.getKit(userId, kitId);
    if (!kit.data) throw new AppError(400, 'Kit is not ready', 'KIT_NOT_READY');

    kit.data.schedule = allocateSchedule(
      kit.data.questions,
      kit.data.role.requirements,
      kit.data.schedule.days_available,
    );

    kit.markModified('data');
    await kit.save();
    return kit;
  }
}

export const kitService = new KitService();
