import type {
  Kit,
  KitInput,
  RegisterInput,
  LoginInput,
  UserPublic,
  PatchQuestionInput,
  AddQuestionInput,
  PatchFlashcardInput,
  AddFlashcardInput,
  PracticeRecordInput,
  QuestionCategory,
  CompanyBrief,
  Question,
  Schedule,
} from '@interviewkit/schemas';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: { error?: { message?: string; code?: string; details?: unknown } } = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore json parse error
    }
    const message = errorData.error?.message || `Request failed with status ${response.status}`;
    const code = errorData.error?.code;
    const details = errorData.error?.details;
    throw new ApiError(message, response.status, code, details);
  }

  return response.json() as Promise<T>;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginInput) =>
    request<{ user: UserPublic }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterInput) =>
    request<{ user: UserPublic }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request<{ user: UserPublic }>('/auth/me'),
};

// ── Kits API ──────────────────────────────────────────────────────────────────

export interface KitSummary {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  step: string;
  progress: number;
  role?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KitDetail {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  step: string;
  progress: number;
  error?: string;
  data?: Kit;
  practiceHistory: Array<{ flashcard_id: string; confidence: number; practiced_at: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface KitStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  step: string;
  progress: number;
  error?: string;
}

export const kitsApi = {
  createKit: (input: KitInput) =>
    request<{ id: string; status: string; step: string; progress: number }>('/kits', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listKits: () => request<{ kits: KitSummary[] }>('/kits'),

  getKit: (id: string) => request<KitDetail>(`/kits/${id}`),

  getKitStatus: (id: string) => request<KitStatusResponse>(`/kits/${id}/status`),

  deleteKit: (id: string) =>
    request<{ success: boolean; message: string }>(`/kits/${id}`, {
      method: 'DELETE',
    }),

  // Questions
  patchQuestion: (kitId: string, questionId: string, patch: PatchQuestionInput) =>
    request<{ success: boolean; kit: Kit }>(`/kits/${kitId}/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  addQuestion: (kitId: string, input: AddQuestionInput) =>
    request<{ success: boolean; kit: Kit }>(`/kits/${kitId}/questions`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteQuestion: (kitId: string, questionId: string) =>
    request<{ success: boolean; kit: Kit }>(`/kits/${kitId}/questions/${questionId}`, {
      method: 'DELETE',
    }),

  // Flashcards
  patchFlashcard: (kitId: string, flashcardId: string, patch: PatchFlashcardInput) =>
    request<{ success: boolean; kit: Kit }>(`/kits/${kitId}/flashcards/${flashcardId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  addFlashcard: (kitId: string, input: AddFlashcardInput) =>
    request<{ success: boolean; kit: Kit }>(`/kits/${kitId}/flashcards`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  deleteFlashcard: (kitId: string, flashcardId: string) =>
    request<{ success: boolean; kit: Kit }>(`/kits/${kitId}/flashcards/${flashcardId}`, {
      method: 'DELETE',
    }),

  // Practice
  recordPractice: (kitId: string, input: PracticeRecordInput) =>
    request<{ success: boolean; practiceHistory: Array<{ flashcard_id: string; confidence: number }> }>(
      `/kits/${kitId}/practice`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  // Regeneration
  regenerateBrief: (kitId: string) =>
    request<{ success: boolean; company_brief: CompanyBrief }>(`/kits/${kitId}/regenerate/brief`, {
      method: 'POST',
    }),

  regenerateCategory: (kitId: string, category: QuestionCategory) =>
    request<{ success: boolean; questions: Question[]; schedule: Schedule }>(
      `/kits/${kitId}/regenerate/category`,
      {
        method: 'POST',
        body: JSON.stringify({ category }),
      },
    ),

  regenerateSchedule: (kitId: string) =>
    request<{ success: boolean; schedule: Schedule }>(`/kits/${kitId}/regenerate/schedule`, {
      method: 'POST',
    }),
};
