export class ActionError extends Error {
  constructor(
    message: string,
    public code: string = "ACTION_ERROR",
    public status: number = 400,
    public error?: unknown,
    public metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ActionError";
    if (error) {
      console.error(error);
    }
  }
}
