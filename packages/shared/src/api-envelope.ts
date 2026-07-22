// Consistent success/error response envelope shared across REST and the frontend API client.
export interface ApiErrorResponse {
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
}

export interface ApiSuccessResponse<T> {
  data: T;
}
