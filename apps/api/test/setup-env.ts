// Must run before any app module loads: middleware/auth.ts reads this at import time.
process.env.ENFORCE_AUTH = "true";
