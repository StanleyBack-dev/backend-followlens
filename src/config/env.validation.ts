import * as Joi from "joi";

const bool = () => Joi.boolean().truthy("true").falsy("false");

export const envValidationSchema = Joi.object({
  // === APP ===
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(4000),
  APP_TIMEZONE: Joi.string().default("America/Sao_Paulo"),
  FRONTEND_URL: Joi.string().uri().required(),

  // === DATABASE (Neon) ===
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .required(),
  DB_SSL: bool().default(true),
  TYPEORM_LOGGING: bool().default(false),

  // === AUTH (Google OAuth) ===
  // From Google Cloud Console → Credentials → OAuth 2.0 Client ID (Web).
  GOOGLE_CLIENT_ID: Joi.string().allow("").optional(),
  // The self-host owner's email. Unlocks the owner-only session sync for that
  // account. Leave empty on a pure public deploy.
  OWNER_EMAIL: Joi.string().email().allow("").optional(),
  // Comma-separated extra admin emails (optional). The master is OWNER_EMAIL.
  ADMIN_EMAILS: Joi.string().allow("").optional(),

  // === SERVICE SECRETS ===
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default("7d"),
  // Shared secret between the Next.js BFF and this API.
  INTERNAL_API_KEY: Joi.string().min(32).required(),

  // Vercel sends it as `Authorization: Bearer <CRON_SECRET>` on scheduled
  // calls. When unset, the /internal endpoints reject every request.
  CRON_SECRET: Joi.string().min(16).allow("").optional(),

  // === ACCOUNT ===
  // Days between a deletion request and the actual removal of the account.
  ACCOUNT_DELETION_GRACE_DAYS: Joi.number().integer().min(1).max(90).default(7),

  // === BILLING (Asaas) ===
  // Without the API key the checkout answers 503; the rest of the app works.
  ASAAS_API_KEY: Joi.string().min(10).allow("").optional(),
  ASAAS_ENVIRONMENT: Joi.string()
    .valid("sandbox", "production")
    .default("sandbox"),
  // Sent by Asaas as the `asaas-access-token` header on every webhook call.
  // When unset, the webhook rejects every request.
  ASAAS_WEBHOOK_TOKEN: Joi.string().min(32).allow("").optional(),
  PRO_PLAN_PRICE_MONTHLY: Joi.number().positive().default(14.9),
  PRO_PLAN_PRICE_YEARLY: Joi.number().positive().default(119.9),
  // Days an overdue subscription keeps Pro before going back to Free.
  BILLING_PAST_DUE_GRACE_DAYS: Joi.number().integer().min(0).max(30).default(3),
  // Offer Pix Automático at checkout. Asaas enables it per account, so it
  // stays off until the account has it.
  BILLING_PIX_AUTOMATIC_ENABLED: bool().default(false),

  // === FREE PLAN LIMITS ===
  FREE_IMPORT_INTERVAL_DAYS: Joi.number().integer().min(0).max(90).default(7),
  FREE_HISTORY_DAYS: Joi.number().integer().min(1).max(365).default(30),
  // Instagram profiles one account may track.
  FREE_PROFILE_LIMIT: Joi.number().integer().min(1).max(20).default(1),
  PRO_PROFILE_LIMIT: Joi.number().integer().min(1).max(20).default(3),

  // === INSTAGRAM SESSION (optional — automatic mode) ===
  // The session-based sync only runs when these are set; the import mode works
  // without them. Cookies from DevTools > Application > Cookies.
  INSTAGRAM_SESSION_ID: Joi.string().allow("").optional(),
  INSTAGRAM_CSRF_TOKEN: Joi.string().allow("").optional(),
  INSTAGRAM_DS_USER_ID: Joi.string().pattern(/^\d*$/).allow("").optional(),
  INSTAGRAM_USERNAME: Joi.string().allow("").optional(),
  INSTAGRAM_USER_AGENT: Joi.string().default(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  ),
  INSTAGRAM_APP_ID: Joi.string().default("936619743392459"),

  // === SYNC SAFETY LOCKS (automatic mode) ===
  SYNC_MANUAL_DAILY_LIMIT: Joi.number().integer().min(0).default(1),
  SYNC_MIN_INTERVAL_MINUTES: Joi.number().integer().min(0).default(60),
  SYNC_PAGE_SIZE: Joi.number().integer().min(5).max(50).default(25),
  SYNC_PAGE_DELAY_MIN_MS: Joi.number().integer().min(500).default(2000),
  SYNC_PAGE_DELAY_MAX_MS: Joi.number().integer().min(500).default(5000),
  SYNC_TIME_BUDGET_MS: Joi.number().integer().min(10000).default(240000),

  // === IMPORT (official export file) ===
  IMPORT_DAILY_LIMIT: Joi.number().integer().min(1).default(10),
  IMPORT_MAX_FILE_MB: Joi.number().integer().min(1).max(50).default(4),
  IMPORT_MAX_UNZIPPED_MB: Joi.number().integer().min(1).max(512).default(64),
  IMPORT_MAX_ZIP_ENTRIES: Joi.number().integer().min(1).max(1000).default(64),
  IMPORT_MAX_LOSS_RATIO: Joi.number().min(0).max(1).default(0.3),

  // === MAIL / BREVO ===
  BREVO_API_KEY: Joi.string().min(10).allow("").optional(),
  MAIL_FROM_EMAIL: Joi.string().email().required(),
  MAIL_FROM_NAME: Joi.string().min(2).default("FollowLens"),
  MAIL_REPLY_TO_EMAIL: Joi.string().email().allow("").optional(),
  MAIL_REPLY_TO_NAME: Joi.string().allow("").optional(),
});
