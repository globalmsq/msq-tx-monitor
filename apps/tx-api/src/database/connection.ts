import mysql from 'mysql2/promise';
import { config } from '../config';

export class DatabaseConnection {
  private static instance: mysql.Pool;

  public static getInstance(): mysql.Pool {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.username,
        password: config.database.password,
        database: config.database.database,
        connectionLimit: config.database.connectionLimit,
        // Additional pool configuration
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: true,
        multipleStatements: false,
        // Character set
        charset: 'utf8mb4',
      });

      console.log('✅ MySQL connection pool created');
    }

    return DatabaseConnection.instance;
  }

  public static async testConnection(): Promise<boolean> {
    try {
      const pool = DatabaseConnection.getInstance();
      const connection = await pool.getConnection();

      // Test query
      await connection.query('SELECT 1 as test');
      connection.release();

      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  public static async closeConnection(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.end();
      console.log('✅ Database connection pool closed');
    }
  }
}
