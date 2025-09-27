export type PaginationShape = {
  page: number;
  limit: number;
  totalData: number;
  totalPage: number;
};

export type StructuredResponse = {
  message?: string;
  data?: unknown;
  pagination?: Partial<PaginationShape>;
};
