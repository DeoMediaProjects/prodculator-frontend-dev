/**
 * Milestone / Production Timeline Service
 * Calls /api/milestones endpoints for CRUD + seeding.
 */
import { apiClient } from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TaskResponse {
  id: string;
  milestone_id: string;
  text: string;
  completed: boolean;
  territory: string | null;
  deadline: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
}

export interface MilestoneResponse {
  id: string;
  user_id: string;
  report_id: string | null;
  title: string;
  description: string | null;
  status: 'completed' | 'in-progress' | 'upcoming';
  due_date: string | null;
  sort_order: number;
  is_template: boolean;
  is_custom: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tasks: TaskResponse[];
}

export interface MilestoneListResponse {
  milestones: MilestoneResponse[];
}

// ── Wrap pattern: { data, error } ────────────────────────────────────────────

type Result<T> = { data: T | null; error: string | null };

function catchErr(err: unknown): string {
  return err instanceof Error ? err.message : 'Request failed';
}

// ── Milestone endpoints ──────────────────────────────────────────────────────

export async function fetchMilestones(
  reportId?: string,
): Promise<Result<MilestoneListResponse>> {
  try {
    const params = reportId ? `?report_id=${reportId}` : '';
    const raw = await apiClient.get<MilestoneListResponse>(
      `/api/milestones${params}`,
      { auth: true },
    );
    const milestones: MilestoneResponse[] = Array.isArray(raw)
      ? (raw as unknown as MilestoneResponse[])
      : Array.isArray((raw as MilestoneListResponse)?.milestones)
        ? (raw as MilestoneListResponse).milestones
        : [];
    return { data: { milestones }, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}

export async function createMilestone(body: {
  title: string;
  description?: string;
  due_date?: string;
  report_id?: string;
}): Promise<Result<MilestoneResponse>> {
  try {
    const data = await apiClient.post<MilestoneResponse>(
      '/api/milestones',
      body,
      { auth: true },
    );
    return { data, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}

export async function updateMilestone(
  milestoneId: string,
  body: {
    title?: string;
    description?: string;
    status?: 'completed' | 'in-progress' | 'upcoming';
    due_date?: string;
    sort_order?: number;
  },
): Promise<Result<MilestoneResponse>> {
  try {
    const data = await apiClient.patch<MilestoneResponse>(
      `/api/milestones/${milestoneId}`,
      body,
      { auth: true },
    );
    return { data, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}

export async function deleteMilestone(
  milestoneId: string,
): Promise<Result<{ success: boolean }>> {
  try {
    const data = await apiClient.delete<{ success: boolean }>(
      `/api/milestones/${milestoneId}`,
      { auth: true },
    );
    return { data, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}

// ── Task endpoints ───────────────────────────────────────────────────────────

export async function createTask(
  milestoneId: string,
  body: { text: string; territory?: string; deadline?: string },
): Promise<Result<TaskResponse>> {
  try {
    const data = await apiClient.post<TaskResponse>(
      `/api/milestones/${milestoneId}/tasks`,
      body,
      { auth: true },
    );
    return { data, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}

export async function updateTask(
  milestoneId: string,
  taskId: string,
  body: { text?: string; completed?: boolean; territory?: string; deadline?: string },
): Promise<Result<TaskResponse>> {
  try {
    const data = await apiClient.patch<TaskResponse>(
      `/api/milestones/${milestoneId}/tasks/${taskId}`,
      body,
      { auth: true },
    );
    return { data, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}

export async function deleteTask(
  milestoneId: string,
  taskId: string,
): Promise<Result<{ success: boolean }>> {
  try {
    const data = await apiClient.delete<{ success: boolean }>(
      `/api/milestones/${milestoneId}/tasks/${taskId}`,
      { auth: true },
    );
    return { data, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}

// ── Seeding ──────────────────────────────────────────────────────────────────

export async function seedMilestones(
  reportId: string,
): Promise<Result<MilestoneListResponse>> {
  try {
    const raw = await apiClient.post<MilestoneListResponse>(
      `/api/milestones/seed/${reportId}`,
      undefined,
      { auth: true },
    );
    const milestones: MilestoneResponse[] = Array.isArray(raw)
      ? (raw as unknown as MilestoneResponse[])
      : Array.isArray((raw as MilestoneListResponse)?.milestones)
        ? (raw as MilestoneListResponse).milestones
        : [];
    return { data: { milestones }, error: null };
  } catch (err) {
    return { data: null, error: catchErr(err) };
  }
}
