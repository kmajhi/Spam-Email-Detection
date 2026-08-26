const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response) {
  try {
    const data = await response.json();
    const err = data?.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const firstKey = Object.keys(err)[0];
      const val = err[firstKey];
      return Array.isArray(val) ? val[0] : String(val);
    }
  } catch {
    // response body wasn't JSON; fall through to generic message
  }
  return "Something went wrong while contacting the server.";
}

export async function predictEmail(text) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/predict/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the backend server. Is it running at " + API_BASE_URL + "?",
      0
    );
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json();
}

export async function fetchModelInfo() {
  const response = await fetch(`${API_BASE_URL}/api/model-info/`);
  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }
  return response.json();
}

export { ApiError };
