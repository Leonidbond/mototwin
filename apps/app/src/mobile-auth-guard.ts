export function isAuthRequiredError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("требуется вход") ||
    message.includes("unauthorized") ||
    message.includes("401")
  );
}

export function handleAuthRequiredError(error: unknown, onAuthRequired: () => void): boolean {
  if (!isAuthRequiredError(error)) {
    return false;
  }
  onAuthRequired();
  return true;
}

export async function withAuthGuard<T>(
  operation: () => Promise<T>,
  onAuthRequired: () => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (handleAuthRequiredError(error, onAuthRequired)) {
      return null;
    }
    throw error;
  }
}
