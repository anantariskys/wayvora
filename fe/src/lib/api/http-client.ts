import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authTokenStore } from "@/stores/auth.store";
import { ApiError, type ApiErrorResponse } from "./api-error";

type AuthRefreshResponse = {
  success: true;
  data: {
    accessToken: string;
    expiresIn: number;
  };
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = authTokenStore.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refreshResponse = await axios.post<AuthRefreshResponse>(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const nextToken = refreshResponse.data.data.accessToken;
      authTokenStore.setAccessToken(nextToken);
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;

      return apiClient(originalRequest);
    }

    return Promise.reject(ApiError.fromAxiosError(error));
  },
);

export type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};
