// Centralized Environment Config reading exclusively from .env (Vite import.meta.env)

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Remote Linux Server
export const SERVER_HOST = import.meta.env.VITE_SSH_HOST;
export const SERVER_PORT = import.meta.env.VITE_SSH_PORT || '22';
export const SERVER_USER = import.meta.env.VITE_SSH_USER;
export const SERVER_PASS = import.meta.env.VITE_SSH_PASS;
export const SERVER_ENV_NAME = import.meta.env.VITE_SERVER_ENV_NAME || `Linux Server (${SERVER_HOST})`;

// Storage & Directory Paths
export const STORAGE_MOUNT_PATH = import.meta.env.VITE_STORAGE_MOUNT_PATH || '/home/skts/IS Migration';
export const DOCUMENTS_PATH = import.meta.env.VITE_DOCUMENTS_PATH || '/home/skts/IS Migration/IS Documents';
export const CASE_MIGRATION_DIR = import.meta.env.VITE_CASE_MIGRATION_DIR || '/home/skts/IS Migration/Migration_Tools/CaseMigration';
export const IS_MIGRATION_DIR = import.meta.env.VITE_IS_MIGRATION_DIR || '/home/skts/IS Migration/Migration_Tools/TrueMigrator';
export const CASE_IMPORT_JAR_PATH = import.meta.env.VITE_CASE_IMPORT_JAR_PATH || '/home/skts/IS Migration/Migration_Tools/CaseMigration/CaseImport/case-import-0.0.1.jar';
export const FILENET_MIGRATOR_CMD = import.meta.env.VITE_FILENET_MIGRATOR_CMD || 'dotnet TrueMigrator.dll';
export const IS_EXTRACTION_SCRIPT = import.meta.env.VITE_IS_EXTRACTION_SCRIPT;
export const CASE_EXTRACTION_JAR_PATH = import.meta.env.VITE_CASE_EXTRACTION_JAR_PATH;
export const CASE_TRANSFORMATION_JAR_PATH = import.meta.env.VITE_CASE_TRANSFORMATION_JAR_PATH;
export const LOG_DIRECTORY_PATH = import.meta.env.VITE_LOG_DIRECTORY_PATH;

// Source Configuration (FileNet Image Services)
export const SOURCE_SYSTEM = import.meta.env.VITE_SOURCE_SYSTEM || 'FileNet Image Services';
export const SOURCE_HOST = import.meta.env.VITE_SOURCE_HOST || 'FNIS';
export const SOURCE_LIBRARY_NAME = import.meta.env.VITE_SOURCE_LIBRARY_NAME || 'FNIS';
export const SOURCE_USERNAME = import.meta.env.VITE_SOURCE_USERNAME || 'SysAdmin';
export const SOURCE_PASSWORD = import.meta.env.VITE_SOURCE_PASSWORD || 'SysAdmin';
export const SOURCE_CONN_STRING = import.meta.env.VITE_SOURCE_CONN_STRING || '';
export const SOURCE_DESCRIPTION = import.meta.env.VITE_SOURCE_DESCRIPTION || '';

// Offline Extraction Settings & Paths
export const OFFLINE_INDEX_DB_TABLE = import.meta.env.VITE_OFFLINE_INDEX_DB_TABLE || 'DOCTABA_STAGING_TABLE';
export const OFFLINE_MKF_EXPORT_PATH = import.meta.env.VITE_OFFLINE_MKF_EXPORT_PATH || '/mnt/truemigrate/staging/mkf db';
export const OFFLINE_MSAR_DAT_PATH = import.meta.env.VITE_OFFLINE_MSAR_DAT_PATH || '/mnt/truemigrate/staging/msar-dat';
export const OFFLINE_FILE_PATTERN = import.meta.env.VITE_OFFLINE_FILE_PATTERN || '*.dat';

// Custom Tables
export const CUSTOM_CASE_TABLE = import.meta.env.VITE_CUSTOM_CASE_TABLE || 'CLAIMS_CASE_METADATA';
export const CUSTOM_DOCTABA_TABLE = import.meta.env.VITE_CUSTOM_DOCTABA_TABLE || 'DOCTABA_STAGING_TABLE';

// Migration Database (RDBMS Staging) Configuration
export const DB_HOST = import.meta.env.VITE_DB_HOST || 'SKTS-LPTP-IN03';
export const DB_PORT = import.meta.env.VITE_DB_PORT || '5432';
export const DB_NAME = import.meta.env.VITE_DB_NAME || 'migration_db';
export const DB_USER = import.meta.env.VITE_DB_USER || 'postgres';
export const DB_PASS = import.meta.env.VITE_DB_PASS || 'password';
export const DB_TYPE = import.meta.env.VITE_DB_TYPE || 'postgres';
export const DB_JDBC_URL = import.meta.env.VITE_DB_JDBC_URL || `jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}`;

// Target Configuration (IBM FileNet P8 / BAW)
export const TARGET_SYSTEM = import.meta.env.VITE_TARGET_SYSTEM || 'FileNet P8';
export const TARGET_HOST = import.meta.env.VITE_TARGET_HOST || 'bawvm.skts.com';
export const TARGET_PORT = import.meta.env.VITE_TARGET_PORT || '9443';
export const TARGET_PROTOCOL = import.meta.env.VITE_TARGET_PROTOCOL || 'https';
export const TARGET_USERNAME = import.meta.env.VITE_TARGET_USERNAME || 'p8admin';
export const TARGET_PASSWORD = import.meta.env.VITE_TARGET_PASSWORD || 'Skts@123';
export const TARGET_OBJECT_STORE = import.meta.env.VITE_TARGET_OBJECT_STORE || 'FNOS';
export const TARGET_TIMEOUT = import.meta.env.VITE_TARGET_TIMEOUT || '30';
export const TARGET_BATCH_IMPORT = import.meta.env.VITE_TARGET_BATCH_IMPORT || 'yes';
export const TARGET_DESCRIPTION = import.meta.env.VITE_TARGET_DESCRIPTION || '';

// Staging Storage (NAS/SAN)
export const STORAGE_TYPE = import.meta.env.VITE_STORAGE_TYPE || 'NAS';
export const STORAGE_PROTOCOL = import.meta.env.VITE_STORAGE_PROTOCOL || 'NFS';
export const STORAGE_HOST = import.meta.env.VITE_STORAGE_HOST || 'linux-server';
export const STORAGE_CAPACITY = import.meta.env.VITE_STORAGE_CAPACITY || '2048';
export const STORAGE_THRESHOLD = import.meta.env.VITE_STORAGE_THRESHOLD || '85';
