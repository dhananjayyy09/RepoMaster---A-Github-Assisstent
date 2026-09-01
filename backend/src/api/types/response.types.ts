export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorDetails {
  code: number;
  message: string;
  details?: any;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetails;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;
