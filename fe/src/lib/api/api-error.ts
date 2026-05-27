import type { AxiosError } from "axios";

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | null;
  };
  meta?: {
    requestId?: string;
  };
};

export class ApiError extends Error {
  code: string;
  details?: ApiErrorDetail[] | null;
  status?: number;

  constructor(params: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | null;
    status?: number;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.details = params.details;
    this.status = params.status;
  }

  static fromAxiosError(error: AxiosError<ApiErrorResponse>) {
    const payload = error.response?.data;

    if (payload?.error) {
      return new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        details: payload.error.details,
        status: error.response?.status,
      });
    }

    return new ApiError({
      code: "NETWORK_ERROR",
      message: error.message || "Unable to reach Wayvora API.",
      status: error.response?.status,
    });
  }
}
