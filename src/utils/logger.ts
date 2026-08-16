export const logger = {
  error(message: string, error?: unknown) {
    if (import.meta.env.DEV) console.error(message, error);
  },
};
