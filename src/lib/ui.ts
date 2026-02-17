export const humanError = (err: unknown, fallback = "Something went wrong.") => {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: string }).message;
    return m || fallback;
  }
  return fallback;
};

export const nowIso = () => new Date().toISOString();

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
