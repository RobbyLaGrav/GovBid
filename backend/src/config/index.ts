// =============================================================================
// GovBid Pro - Configuration Index
// =============================================================================
// Central export for all configuration modules
// =============================================================================

// Database configuration
export {
  prisma,
  databaseConfig,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  withTransaction,
  executeWithTimeout,
  registerShutdownHandler,
} from './database';
export type { DatabaseConfig, TransactionClient } from './database';

// Redis configuration
export {
  redis,
  redisConfig,
  connectRedis,
  closeRedis,
  checkRedisHealth,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetOrSet,
  checkRateLimit,
  setSession,
  getSession,
  deleteSession,
  extendSession,
} from './redis';
export type { RedisConfig, CacheOptions, RateLimitResult } from './redis';

// AI configuration
export {
  aiConfig,
  claudeConfig,
  openaiConfig,
  pineconeConfig,
  getClaudeClient,
  createClaudeCompletion,
  systemPrompts,
  estimateTokenCount,
  truncateToTokenLimit,
  splitTextIntoChunks,
  validateAIConfig,
} from './ai';
export type {
  AIConfig,
  ClaudeConfig,
  OpenAIConfig,
  PineconeConfig,
  AIMessage,
  AICompletionRequest,
  AICompletionResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
} from './ai';

// AWS/S3 configuration
export {
  awsConfig,
  s3Config,
  storageConfig,
  getS3Client,
  generateS3Key,
  uploadToS3,
  downloadFromS3,
  deleteFromS3,
  fileExistsInS3,
  getFileInfo,
  listFilesInS3,
  copyInS3,
  getUploadSignedUrl,
  getDownloadSignedUrl,
  isAllowedFileType,
  isAllowedFileSize,
  validateAWSConfig,
  S3Folders,
} from './aws';
export type {
  AWSConfig,
  S3Config,
  StorageConfig,
  UploadOptions,
  UploadResult,
  FileInfo,
} from './aws';

// Stripe configuration
export {
  stripeConfig,
  subscriptionPlans,
  getStripeClient,
  createCustomer,
  updateCustomer,
  getCustomer,
  deleteCustomer,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getSubscription,
  changeSubscriptionPlan,
  createPaymentIntent,
  createSetupIntent,
  listPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  listInvoices,
  getUpcomingInvoice,
  constructWebhookEvent,
  WebhookEvents,
  createBillingPortalSession,
  createCheckoutSession,
  getPlanById,
  getPlanLimits,
  isLimitExceeded,
  validateStripeConfig,
} from './stripe';
export type { StripeConfig, PlanConfig, PlanLimits } from './stripe';

// Email configuration
export {
  emailConfig,
  smtpConfig,
  sendgridConfig,
  getTransporter,
  sendEmail,
  emailTemplates,
  validateEmailConfig,
  testEmailConfig,
} from './email';
export type {
  EmailConfig,
  SMTPConfig,
  SendGridConfig,
  EmailOptions,
  EmailAttachment,
  EmailResult,
} from './email';

// Calendar configuration
export {
  calendarConfig,
  googleCalendarConfig,
  microsoftCalendarConfig,
  getGoogleAuthUrl,
  getMicrosoftAuthUrl,
  exchangeGoogleCode,
  exchangeMicrosoftCode,
  refreshGoogleToken,
  refreshMicrosoftToken,
  toGoogleCalendarEvent,
  toMicrosoftCalendarEvent,
  fromGoogleCalendarEvent,
  fromMicrosoftCalendarEvent,
  validateCalendarConfig,
} from './calendar';
export type {
  CalendarConfig,
  GoogleCalendarConfig,
  MicrosoftCalendarConfig,
  TokenResponse,
  CalendarEvent,
  GoogleCalendarEvent,
  MicrosoftCalendarEvent,
} from './calendar';

// =============================================================================
// APPLICATION CONFIGURATION
// =============================================================================

export interface AppConfig {
  env: string;
  name: string;
  url: string;
  apiUrl: string;
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  sessionSecret: string;
  encryptionKey: string;
  logLevel: string;
  enableApiDocs: boolean;
  enableSeedData: boolean;
}

export const appConfig: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'GovBid Pro',
  url: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_key',
  encryptionKey: process.env.ENCRYPTION_KEY || 'your_32_character_encryption_key',
  logLevel: process.env.LOG_LEVEL || 'info',
  enableApiDocs: process.env.ENABLE_API_DOCS !== 'false',
  enableSeedData: process.env.ENABLE_SEED_DATA === 'true',
};

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipFailedRequests: boolean;
  skipSuccessfulRequests: boolean;
}

export const rateLimitConfig: RateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
};

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export interface FeatureFlags {
  contractScraping: boolean;
  aiBidCoach: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  competitiveAnalysis: boolean;
  teamCollaboration: boolean;
  calendarIntegration: boolean;
}

export const featureFlags: FeatureFlags = {
  contractScraping: process.env.ENABLE_CONTRACT_SCRAPING !== 'false',
  aiBidCoach: process.env.ENABLE_AI_BID_COACH !== 'false',
  emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
  pushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
  competitiveAnalysis: process.env.ENABLE_COMPETITIVE_ANALYSIS !== 'false',
  teamCollaboration: process.env.ENABLE_TEAM_COLLABORATION !== 'false',
  calendarIntegration: process.env.ENABLE_CALENDAR_INTEGRATION !== 'false',
};

// =============================================================================
// VALIDATION
// =============================================================================

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all configuration
 */
export function validateAllConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (appConfig.env === 'production') {
    if (appConfig.jwtSecret === 'your_super_secret_jwt_key_change_in_production') {
      errors.push('JWT_SECRET must be changed in production');
    }
    if (appConfig.sessionSecret === 'your_session_secret_key') {
      errors.push('SESSION_SECRET must be changed in production');
    }
  }

  // Validate individual configs
  const aiValidation = validateAIConfig();
  if (!aiValidation.valid) {
    errors.push(...aiValidation.errors);
  }

  const awsValidation = validateAWSConfig();
  if (!awsValidation.valid && !storageConfig.useLocalStorage) {
    errors.push(...awsValidation.errors);
  }

  const stripeValidation = validateStripeConfig();
  if (!stripeValidation.valid) {
    warnings.push(...stripeValidation.errors.map((e) => `Stripe: ${e}`));
  }

  const emailValidation = validateEmailConfig();
  if (!emailValidation.valid) {
    warnings.push(...emailValidation.errors.map((e) => `Email: ${e}`));
  }

  const calendarValidation = validateCalendarConfig();
  if (!calendarValidation.google.valid) {
    warnings.push(...calendarValidation.google.errors.map((e) => `Google Calendar: ${e}`));
  }
  if (!calendarValidation.microsoft.valid) {
    warnings.push(...calendarValidation.microsoft.errors.map((e) => `Microsoft Calendar: ${e}`));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize all services
 */
export async function initializeServices(): Promise<void> {
  console.log('🚀 Initializing GovBid Pro services...');

  // Validate configuration
  const validation = validateAllConfig();
  if (!validation.valid) {
    console.error('❌ Configuration errors:');
    validation.errors.forEach((error) => console.error(`   - ${error}`));
    throw new Error('Invalid configuration');
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    validation.warnings.forEach((warning) => console.warn(`   - ${warning}`));
  }

  // Connect to database
  await connectDatabase();

  // Connect to Redis
  await connectRedis();

  console.log('✅ All services initialized');
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownServices(): Promise<void> {
  console.log('🔄 Shutting down services...');

  await disconnectDatabase();
  await closeRedis();

  console.log('✅ All services shut down');
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  app: appConfig,
  rateLimit: rateLimitConfig,
  features: featureFlags,
  validateAll: validateAllConfig,
  initialize: initializeServices,
  shutdown: shutdownServices,
};
