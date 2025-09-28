/**
 * Normalized pagination metadata returned with list responses.
 */
export type PaginationShape = {
  page: number;
  limit: number;
  totalData: number;
  totalPage: number;
};

/**
 * Intermediate structure leveraged by the success interceptor when wrapping payloads.
 */
export type StructuredResponse = {
  message?: string;
  data?: unknown;
  pagination?: Partial<PaginationShape>;
};
