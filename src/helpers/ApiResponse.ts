export class Response {
  status: "SUCCESS" | "ERROR";
  module: string | undefined;
  data: string | Record<string, unknown> | unknown[] | null;
  cache?: boolean;
  error?: string;

  constructor(
    status: "SUCCESS" | "ERROR",
    module: string | undefined,
    data: string | Record<string, unknown> | unknown[] | null,
    cache?: boolean,
    error?: string,
  ) {
    this.status = status;
    this.module = module;
    this.data = data;
    this.cache = cache;
    this.error = error;
  }
}
