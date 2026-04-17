export * from './team';
export * from './match';
export * from './player';
export * from './tournament';
export * from './auth';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
