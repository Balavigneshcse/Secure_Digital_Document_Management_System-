// USE_MOCKS toggles the whole app between mock data and the real API.
// Flip to false (or wire per-service) once Balavignesh's endpoints are live.
export const USE_MOCKS = false;

export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
