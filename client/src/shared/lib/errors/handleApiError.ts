import { ApiError } from "./ApiError";

export async function handleApiError(
  response: Response,
  defaultMessage: string = "API request failed",
): Promise<never> {
  let message = defaultMessage;
  let details: unknown;

  try {
    const data = await response.json();
    if (data && data.error) {
      message = data.error;
    } else if (data && data.message) {
      message = data.message;
    }
    details = data;
  } catch {
    // Response is not JSON, fallback to status text if available
    if (response.statusText) {
      message = `${defaultMessage}: ${response.statusText}`;
    }
  }

  throw new ApiError(message, response.status, details);
}
