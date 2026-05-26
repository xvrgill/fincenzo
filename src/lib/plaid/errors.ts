import { isAxiosError } from "axios";

// Plaid returns error details as JSON in the axios response body. Without
// extracting them, all we see in Sentry is "AxiosError: status code 400",
// which hides the actual error_code (ITEM_LOGIN_REQUIRED, PRODUCT_NOT_READY,
// INVALID_ACCESS_TOKEN, etc.) and the request_id Plaid support needs.
export type PlaidApiErrorBody = {
  error_type?: string;
  error_code?: string;
  error_message?: string;
  display_message?: string | null;
  request_id?: string;
  suggested_action?: string | null;
};

export class PlaidApiError extends Error {
  readonly status: number;
  readonly body: PlaidApiErrorBody;
  readonly endpoint: string;

  constructor(endpoint: string, status: number, body: PlaidApiErrorBody) {
    const code = body.error_code ?? "UNKNOWN";
    const msg = body.error_message ?? body.display_message ?? "Plaid request failed";
    super(`Plaid ${endpoint} ${status} ${code}: ${msg}`);
    this.name = "PlaidApiError";
    this.status = status;
    this.body = body;
    this.endpoint = endpoint;
  }
}

export async function callPlaid<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      const data = (err.response.data ?? {}) as PlaidApiErrorBody;
      throw new PlaidApiError(endpoint, err.response.status, data);
    }
    throw err;
  }
}
