// Centralized Environment Config reading exclusively from .env (Vite import.meta.env)

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Remote Linux Server
// SSH connection details removed, now strictly managed by backend properties.

// Storage & Directory Paths
export let STORAGE_MOUNT_PATH = import.meta.env.VITE_STORAGE_MOUNT_PATH || '/home/skts/IS Migration';
export let DOCUMENTS_PATH = import.meta.env.VITE_DOCUMENTS_PATH || '/home/skts/IS Migration/IS Documents';
export let CASE_MIGRATION_DIR = import.meta.env.VITE_CASE_MIGRATION_DIR || '/home/skts/IS Migration/Migration_Tools/CaseMigration';
export let IS_MIGRATION_DIR = import.meta.env.VITE_IS_MIGRATION_DIR || '/home/skts/IS Migration/Migration_Tools/TrueMigrator';
export let CASE_IMPORT_JAR_PATH = import.meta.env.VITE_CASE_IMPORT_JAR_PATH || '/home/skts/IS Migration/Migration_Tools/CaseMigration/CaseImport/case-import-0.0.1.jar';
export let FILENET_MIGRATOR_CMD = import.meta.env.VITE_FILENET_MIGRATOR_CMD || 'dotnet TrueMigrator.dll';
export let IS_EXTRACTION_SCRIPT = import.meta.env.VITE_IS_EXTRACTION_SCRIPT;
export let CASE_EXTRACTION_JAR_PATH = import.meta.env.VITE_CASE_EXTRACTION_JAR_PATH;
export let CASE_TRANSFORMATION_JAR_PATH = import.meta.env.VITE_CASE_TRANSFORMATION_JAR_PATH;
export let LOG_DIRECTORY_PATH = import.meta.env.VITE_LOG_DIRECTORY_PATH;

// Source Configuration (FileNet Image Services)
export const SOURCE_SYSTEM = import.meta.env.VITE_SOURCE_SYSTEM || 'FileNet Image Services';
export const SOURCE_HOST = import.meta.env.VITE_SOURCE_HOST || '';
export const SOURCE_LIBRARY_NAME = import.meta.env.VITE_SOURCE_LIBRARY_NAME || '';
export const SOURCE_USERNAME = import.meta.env.VITE_SOURCE_USERNAME || '';
export const SOURCE_PASSWORD = import.meta.env.VITE_SOURCE_PASSWORD || '';
export const SOURCE_CONN_STRING = import.meta.env.VITE_SOURCE_CONN_STRING || '';
export const SOURCE_DESCRIPTION = import.meta.env.VITE_SOURCE_DESCRIPTION || '';

// Offline Extraction Settings & Paths
export let OFFLINE_INDEX_DB_TABLE = import.meta.env.VITE_OFFLINE_INDEX_DB_TABLE || '';
export let OFFLINE_MKF_EXPORT_PATH = import.meta.env.VITE_OFFLINE_MKF_EXPORT_PATH || '';
export let OFFLINE_MSAR_DAT_PATH = import.meta.env.VITE_OFFLINE_MSAR_DAT_PATH || '';
export let OFFLINE_FILE_PATTERN = import.meta.env.VITE_OFFLINE_FILE_PATTERN || '*.dat';

// Custom Tables
export const CUSTOM_CASE_TABLE = import.meta.env.VITE_CUSTOM_CASE_TABLE || 'CLAIMS_CASE_METADATA';
export const CUSTOM_DOCTABA_TABLE = import.meta.env.VITE_CUSTOM_DOCTABA_TABLE || 'DOCTABA_STAGING_TABLE';

// Migration Database (RDBMS Staging) Configuration
export const DB_HOST = import.meta.env.VITE_DB_HOST || '';
export const DB_PORT = import.meta.env.VITE_DB_PORT || '5432';
export const DB_NAME = import.meta.env.VITE_DB_NAME || '';
export const DB_USER = import.meta.env.VITE_DB_USER || '';
export const DB_PASS = import.meta.env.VITE_DB_PASS || '';
export const DB_TYPE = import.meta.env.VITE_DB_TYPE || 'postgres';
export const DB_JDBC_URL = import.meta.env.VITE_DB_JDBC_URL || '';

// Target Configuration (IBM FileNet P8 / BAW)
export const TARGET_SYSTEM = import.meta.env.VITE_TARGET_SYSTEM || 'FileNet P8';
export const TARGET_HOST = import.meta.env.VITE_TARGET_HOST || '';
export const TARGET_PORT = import.meta.env.VITE_TARGET_PORT || '9443';
export const TARGET_PROTOCOL = import.meta.env.VITE_TARGET_PROTOCOL || 'https';
export const TARGET_USERNAME = import.meta.env.VITE_TARGET_USERNAME || '';
export const TARGET_PASSWORD = import.meta.env.VITE_TARGET_PASSWORD || '';
export const TARGET_OBJECT_STORE = import.meta.env.VITE_TARGET_OBJECT_STORE || '';
export const TARGET_TIMEOUT = import.meta.env.VITE_TARGET_TIMEOUT || '30';
export const TARGET_BATCH_IMPORT = import.meta.env.VITE_TARGET_BATCH_IMPORT || 'yes';
export const TARGET_DESCRIPTION = import.meta.env.VITE_TARGET_DESCRIPTION || '';

// Staging Storage (NAS/SAN)
export const STORAGE_TYPE = import.meta.env.VITE_STORAGE_TYPE || 'NAS';
export const STORAGE_PROTOCOL = import.meta.env.VITE_STORAGE_PROTOCOL || 'NFS';
export const STORAGE_HOST = import.meta.env.VITE_STORAGE_HOST || '';
export const STORAGE_CAPACITY = import.meta.env.VITE_STORAGE_CAPACITY || '';
export const STORAGE_THRESHOLD = import.meta.env.VITE_STORAGE_THRESHOLD || '85';

export async function loadEnvConfig() {
  try {
    const res = await fetch(`${API_BASE_URL}/config/env-paths`);
    if (res.ok) {
      const paths = await res.json();
      STORAGE_MOUNT_PATH = paths.storageMountPath || STORAGE_MOUNT_PATH;
      DOCUMENTS_PATH = paths.documentsPath || DOCUMENTS_PATH;
      CASE_MIGRATION_DIR = paths.caseMigrationDir || CASE_MIGRATION_DIR;
      IS_MIGRATION_DIR = paths.isMigrationDir || IS_MIGRATION_DIR;
      CASE_IMPORT_JAR_PATH = paths.caseImportJarPath || CASE_IMPORT_JAR_PATH;
      FILENET_MIGRATOR_CMD = paths.filenetMigratorCmd || FILENET_MIGRATOR_CMD;
      IS_EXTRACTION_SCRIPT = paths.isExtractionScript || IS_EXTRACTION_SCRIPT;
      CASE_EXTRACTION_JAR_PATH = paths.caseExtractionJarPath || CASE_EXTRACTION_JAR_PATH;
      CASE_TRANSFORMATION_JAR_PATH = paths.caseTransformationJarPath || CASE_TRANSFORMATION_JAR_PATH;
      LOG_DIRECTORY_PATH = paths.logDirectoryPath || LOG_DIRECTORY_PATH;

      OFFLINE_INDEX_DB_TABLE = paths.offlineIndexDbTable || OFFLINE_INDEX_DB_TABLE;
      OFFLINE_MKF_EXPORT_PATH = paths.offlineMkfExportPath || OFFLINE_MKF_EXPORT_PATH;
      OFFLINE_MSAR_DAT_PATH = paths.offlineMsarDatPath || OFFLINE_MSAR_DAT_PATH;
      OFFLINE_FILE_PATTERN = paths.offlineFilePattern || OFFLINE_FILE_PATTERN;
    }
  } catch (err) {
    console.error('Failed to load truemigrate paths from backend, falling back to build env:', err);
  }
}
