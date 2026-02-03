// =============================================================================
// GovBid Pro - Database Configuration
// =============================================================================
// PostgreSQL database configuration using Prisma
// =============================================================================

import { PrismaClient } from '@prisma/client';

// =============================================================================
// PRISMA CLIENT SINGLETON
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { level: 'query', emit: 'event' },
          { level: 'info', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ]
      : [
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ],
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
};

// Prevent multiple instances of Prisma Client in development
export const prisma = global.prisma || new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  poolMin: number;
  poolMax: number;
  connectionTimeout: number;
  idleTimeout: number;
}

export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/govbid_pro',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'govbid_user',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'govbid_pro',
  ssl: process.env.NODE_ENV === 'production',
  poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
  poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
};

// =============================================================================
// DATABASE CONNECTION HELPERS
// =============================================================================

/**
 * Connect to the database
 * Call this during application startup
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Log connection info in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`   Host: ${databaseConfig.host}:${databaseConfig.port}`);
      console.log(`   Database: ${databaseConfig.database}`);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from the database
 * Call this during application shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

/**
 * Check database health
 * Returns true if database is accessible
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Execute a raw query with timeout
 */
export async function executeWithTimeout<T>(
  query: Promise<T>,
  timeoutMs: number = databaseConfig.connectionTimeout
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Database query timeout')), timeoutMs);
  });

  return Promise.race([query, timeout]);
}

// =============================================================================
// TRANSACTION HELPERS
// =============================================================================

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute operations within a transaction
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
  }
): Promise<T> {
  return prisma.$transaction(callback, {
    maxWait: options?.maxWait || 5000,
    timeout: options?.timeout || 10000,
    isolationLevel: options?.isolationLevel,
  });
}

// =============================================================================
// QUERY LOGGING (Development)
// =============================================================================

if (process.env.NODE_ENV === 'development' && process.env.ENABLE_QUERY_LOGGING === 'true') {
  prisma.$on('query' as never, (e: { query: string; params: string; duration: number }) => {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
    console.log('---');
  });
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const shutdownHandlers: (() => Promise<void>)[] = [disconnectDatabase];

export function registerShutdownHandler(handler: () => Promise<void>): void {
  shutdownHandlers.push(handler);
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  for (const handler of shutdownHandlers) {
    try {
      await handler();
    } catch (error) {
      console.error('Shutdown handler error:', error);
    }
  }

  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  prisma,
  config: databaseConfig,
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  checkHealth: checkDatabaseHealth,
  withTransaction,
  executeWithTimeout,
  registerShutdownHandler,
};
