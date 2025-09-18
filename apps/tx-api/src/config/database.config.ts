/**
 * Database Configuration
 * Constructs DATABASE_URL from individual MySQL environment variables
 * NO default values - will error if any required variable is missing
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionLimit: number;
  connectionTimeout: number;
  acquireTimeout: number;
  timeout: number;
}

/**
 * Validates and retrieves a required environment variable
 * Throws an error if the variable is missing or empty
 */
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * Validates and retrieves a required numeric environment variable
 * Throws an error if the variable is missing, empty, or not a valid number
 */
function getRequiredNumericEnvVar(name: string): number {
  const value = getRequiredEnvVar(name);
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) {
    throw new Error(
      `Environment variable ${name} must be a valid number, got: ${value}`
    );
  }
  return numValue;
}

/**
 * Constructs DATABASE_URL from individual MySQL environment variables
 * Sets the DATABASE_URL in process.env for Prisma to use
 */
export function initializeDatabaseConfig(): DatabaseConfig {
  try {
    // Get required MySQL connection variables
    const host = getRequiredEnvVar('MYSQL_HOST');
    const port = getRequiredNumericEnvVar('MYSQL_PORT');
    const database = getRequiredEnvVar('MYSQL_DATABASE');
    const username = getRequiredEnvVar('MYSQL_USERNAME');
    const password = getRequiredEnvVar('MYSQL_PASSWORD');

    // Construct DATABASE_URL
    const databaseUrl = `mysql://${username}:${password}@${host}:${port}/${database}`;

    // Set DATABASE_URL in process.env for Prisma
    process.env.DATABASE_URL = databaseUrl;

    console.log(
      `✅ Database URL constructed for database: ${database} on ${host}:${port}`
    );

    // Get optional configuration variables with error handling
    let connectionLimit = 10;
    let connectionTimeout = 60000;
    let acquireTimeout = 60000;
    let timeout = 5000;

    try {
      if (process.env.DB_CONNECTION_LIMIT) {
        connectionLimit = getRequiredNumericEnvVar('DB_CONNECTION_LIMIT');
      }
    } catch (error) {
      console.warn(`⚠️ Invalid DB_CONNECTION_LIMIT, using default: 10`);
    }

    try {
      if (process.env.DB_CONNECTION_TIMEOUT) {
        connectionTimeout = getRequiredNumericEnvVar('DB_CONNECTION_TIMEOUT');
      }
    } catch (error) {
      console.warn(`⚠️ Invalid DB_CONNECTION_TIMEOUT, using default: 60000`);
    }

    try {
      if (process.env.DB_ACQUIRE_TIMEOUT) {
        acquireTimeout = getRequiredNumericEnvVar('DB_ACQUIRE_TIMEOUT');
      }
    } catch (error) {
      console.warn(`⚠️ Invalid DB_ACQUIRE_TIMEOUT, using default: 60000`);
    }

    try {
      if (process.env.DB_TIMEOUT) {
        timeout = getRequiredNumericEnvVar('DB_TIMEOUT');
      }
    } catch (error) {
      console.warn(`⚠️ Invalid DB_TIMEOUT, using default: 5000`);
    }

    return {
      host,
      port,
      database,
      username,
      password,
      connectionLimit,
      connectionTimeout,
      acquireTimeout,
      timeout,
    };
  } catch (error) {
    console.error('❌ Failed to initialize database configuration:');
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}`
    );
    console.error('');
    console.error('Required environment variables:');
    console.error('  - MYSQL_HOST: Database host address');
    console.error('  - MYSQL_PORT: Database port number');
    console.error('  - MYSQL_DATABASE: Database name');
    console.error('  - MYSQL_USERNAME: Database username');
    console.error('  - MYSQL_PASSWORD: Database password');
    console.error('');
    process.exit(1);
  }
}
