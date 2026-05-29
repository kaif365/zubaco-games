export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFn<T = void, A extends unknown[] = []> = (
  ...args: A
) => Promise<T>;
