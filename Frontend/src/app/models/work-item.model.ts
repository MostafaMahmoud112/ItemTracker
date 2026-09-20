export type WorkItemStatus = 'Todo' | 'InProgress' | 'Done';

export interface WorkItem {
  id: number;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string | null;
}

export interface UpdateWorkItemStatusRequest {
  status: WorkItemStatus;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export interface WorkItemListQuery {
  search?: string;
  status?: WorkItemStatus | null;
  page: number;
  pageSize?: number;
}
