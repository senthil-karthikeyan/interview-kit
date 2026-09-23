import { Router, type IRouter } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  createKit,
  listKits,
  getKit,
  getKitStatus,
  deleteKit,
  patchQuestion,
  addQuestion,
  deleteQuestion,
  patchFlashcard,
  addFlashcard,
  deleteFlashcard,
  recordPractice,
  regenerateBrief,
  regenerateCategory,
  regenerateSchedule,
} from './kits.handlers.js';

export const kitsRouter: IRouter = Router();

// Protect all /api/kits routes with session authentication
kitsRouter.use(requireAuth);

// Kit collection
kitsRouter.post('/', createKit);
kitsRouter.get('/', listKits);

// Single kit operations
kitsRouter.get('/:id', getKit);
kitsRouter.get('/:id/status', getKitStatus);
kitsRouter.delete('/:id', deleteKit);

// Questions
kitsRouter.post('/:id/questions', addQuestion);
kitsRouter.patch('/:id/questions/:questionId', patchQuestion);
kitsRouter.delete('/:id/questions/:questionId', deleteQuestion);

// Flashcards
kitsRouter.post('/:id/flashcards', addFlashcard);
kitsRouter.patch('/:id/flashcards/:flashcardId', patchFlashcard);
kitsRouter.delete('/:id/flashcards/:flashcardId', deleteFlashcard);

// Practice
kitsRouter.post('/:id/practice', recordPractice);

// Regeneration with state preservation
kitsRouter.post('/:id/regenerate/brief', regenerateBrief);
kitsRouter.post('/:id/regenerate/category', regenerateCategory);
kitsRouter.post('/:id/regenerate/schedule', regenerateSchedule);
