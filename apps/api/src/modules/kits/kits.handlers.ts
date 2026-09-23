import type { Request, Response, NextFunction } from 'express';
import {
  KitInputSchema,
  PatchQuestionInputSchema,
  AddQuestionInputSchema,
  PatchFlashcardInputSchema,
  AddFlashcardInputSchema,
  PracticeRecordInputSchema,
  RegenerateCategoryInputSchema,
} from '@interviewkit/schemas';
import { kitService } from './kit.service.js';
import { getLLMProvider } from '../../services/ai.service.js';

export async function createKit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = KitInputSchema.parse(req.body);
    const userId = req.session.userId!;
    const llm = getLLMProvider();

    const kit = await kitService.createKit(userId, input, llm);
    res.status(201).json({
      id: kit._id,
      status: kit.status,
      step: kit.step,
      progress: kit.progress,
      input: kit.input,
      createdAt: kit.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function listKits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const kits = await kitService.listKits(userId);
    res.json({
      kits: kits.map((k) => ({
        id: k._id,
        status: k.status,
        step: k.step,
        progress: k.progress,
        role: k.data?.role?.title,
        company: k.data?.source?.company,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getKit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const kit = await kitService.getKit(userId, req.params.id);
    res.json({
      id: kit._id,
      status: kit.status,
      step: kit.step,
      progress: kit.progress,
      error: kit.error,
      data: kit.data,
      practiceHistory: kit.practiceHistory,
      createdAt: kit.createdAt,
      updatedAt: kit.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function getKitStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const kit = await kitService.getKit(userId, req.params.id);
    res.json({
      id: kit._id,
      status: kit.status,
      step: kit.step,
      progress: kit.progress,
      error: kit.error,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteKit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    await kitService.deleteKit(userId, req.params.id);
    res.json({ success: true, message: 'Kit deleted' });
  } catch (err) {
    next(err);
  }
}

export async function patchQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const patch = PatchQuestionInputSchema.parse(req.body);
    const kit = await kitService.updateQuestion(userId, req.params.id, req.params.questionId, patch);
    res.json({ success: true, kit: kit.data });
  } catch (err) {
    next(err);
  }
}

export async function addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const input = AddQuestionInputSchema.parse(req.body);
    const kit = await kitService.addQuestion(userId, req.params.id, input);
    res.status(201).json({ success: true, kit: kit.data });
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const kit = await kitService.deleteQuestion(userId, req.params.id, req.params.questionId);
    res.json({ success: true, kit: kit.data });
  } catch (err) {
    next(err);
  }
}

export async function patchFlashcard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const patch = PatchFlashcardInputSchema.parse(req.body);
    const kit = await kitService.updateFlashcard(userId, req.params.id, req.params.flashcardId, patch);
    res.json({ success: true, kit: kit.data });
  } catch (err) {
    next(err);
  }
}

export async function addFlashcard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const input = AddFlashcardInputSchema.parse(req.body);
    const kit = await kitService.addFlashcard(userId, req.params.id, input);
    res.status(201).json({ success: true, kit: kit.data });
  } catch (err) {
    next(err);
  }
}

export async function deleteFlashcard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const kit = await kitService.deleteFlashcard(userId, req.params.id, req.params.flashcardId);
    res.json({ success: true, kit: kit.data });
  } catch (err) {
    next(err);
  }
}

export async function recordPractice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const input = PracticeRecordInputSchema.parse(req.body);
    const kit = await kitService.recordPractice(userId, req.params.id, input);
    res.json({ success: true, practiceHistory: kit.practiceHistory });
  } catch (err) {
    next(err);
  }
}

export async function regenerateBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const llm = getLLMProvider();
    const kit = await kitService.regenerateCompanyBrief(userId, req.params.id, llm);
    res.json({ success: true, company_brief: kit.data?.company_brief });
  } catch (err) {
    next(err);
  }
}

export async function regenerateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const { category } = RegenerateCategoryInputSchema.parse(req.body);
    const llm = getLLMProvider();
    const kit = await kitService.regenerateCategory(userId, req.params.id, category, llm);
    res.json({ success: true, questions: kit.data?.questions, schedule: kit.data?.schedule });
  } catch (err) {
    next(err);
  }
}

export async function regenerateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const kit = await kitService.regenerateSchedule(userId, req.params.id);
    res.json({ success: true, schedule: kit.data?.schedule });
  } catch (err) {
    next(err);
  }
}
