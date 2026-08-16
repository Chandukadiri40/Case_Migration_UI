export const JOB_CATEGORIES = [
  { id: 'extraction', label: 'Extraction Jobs' },
  { id: 'import', label: 'Import Jobs' }
];

export const INITIAL_JOBS = [
  {
    id: '1',
    name: 'EXT_JOB_001',
    category: 'extraction',
    type: 'Bulk',
    source: 'FileNet P8',
    dateRange: '01-May-2025 – 07-May-2025',
    filterCriteria: 'Document Date',
    records: 10000,
    status: 'Running',
    createdBy: 'a.sharma',
    createdDate: '28-Apr-2025',
    env: 'Linux RHEL 8 (192.168.1.105)',
    command: 'bash /opt/truemigrate/scripts/extract_filenet_bulk.sh --source p8_prod --batch 10000',
    logPath: '/var/log/truemigrate/extract_job_001.log',
    logs: [
      '[INFO] 2025-05-01 10:00:00 - Initializing extraction connector for FileNet P8...',
      '[INFO] Connecting to Content Engine at http://p8-ce-prod:9080/wsi/FNCEWS40MTOM...',
      '[INFO] Connection established successfully. Object Store: FNOS',
      '[INFO] Scanning for records between 01-May-2025 and 07-May-2025...',
      '[INFO] Found 10,000 eligible records.',
      '[INFO] Starting batch extraction process...',
      '[INFO] Processing Batch #1 (Records 1-1000)...',
      '[WARN] 2025-05-01 10:02:15 - Latency spike detected on Content Engine API. Retrying...',
      '[INFO] Processing Batch #2 (Records 1001-2000)...',
      '[INFO] Successfully extracted 2,000 records so far.'
    ]
  },
  {
    id: '2',
    name: 'EXT_ADHOC_001',
    category: 'extraction',
    type: 'Ad-hoc',
    source: 'SharePoint',
    dateRange: 'Specific Records',
    filterCriteria: 'Folder = /Contracts',
    records: 100,
    status: 'Completed',
    createdBy: 'r.iyer',
    createdDate: '29-Apr-2025',
    env: 'Linux Ubuntu 22.04',
    command: 'bash /opt/truemigrate/scripts/extract_sp_adhoc.sh --folder "/Contracts" --limit 100',
    logPath: '/var/log/truemigrate/extract_adhoc_001.log',
    logs: [
      '[INFO] 2025-05-02 08:30:00 - Starting ad-hoc SharePoint document extraction...',
      '[INFO] Authenticating via Microsoft Graph API CLI...',
      '[INFO] Auth successful. Target path: /Contracts',
      '[INFO] Indexing folder content...',
      '[INFO] Found 100 files inside folder.',
      '[INFO] Downloading file: Contract_Renewal_2025.pdf (1.2 MB)',
      '[INFO] Downloading file: Vendor_Agreement_ACME.docx (400 KB)',
      '[INFO] Successfully downloaded 100 files.',
      '[INFO] Job COMPLETED successfully at 2025-05-02 08:34:12.'
    ]
  },
  {
    id: '3',
    name: 'EXT_JOB_002',
    category: 'extraction',
    type: 'Bulk',
    source: 'Database',
    dateRange: '01-May-2025 – 15-May-2025',
    filterCriteria: 'Query: status=active',
    records: 4200,
    status: 'Failed',
    createdBy: 'system',
    createdDate: '30-Apr-2025',
    env: 'Linux RHEL 8 (192.168.1.105)',
    command: 'python3 /opt/truemigrate/scripts/db_extract.py --table users --status active',
    logPath: '/var/log/truemigrate/db_extract_002.log',
    logs: [
      '[INFO] 2025-05-03 12:00:00 - Initializing Database Extractor...',
      '[INFO] Attempting connection to PostgreSQL db_prod at 192.168.1.145:5432...',
      '[INFO] Database connection OK.',
      '[INFO] Querying: SELECT * FROM users WHERE status=\'active\'',
      '[INFO] Found 4,200 matching rows.',
      '[INFO] Exporting rows to CSV format...',
      '[ERROR] 2025-05-03 12:01:45 - Connection timed out while reading table packets.',
      '[ERROR] FATAL: Process terminated unexpectedly. Connection broken.'
    ]
  },
  {
    id: '4',
    name: 'EXT_EXC_001',
    category: 'extraction',
    type: 'Exception',
    source: 'FileNet P8',
    dateRange: 'Failed Records',
    filterCriteria: 'Error Code = 500',
    records: 250,
    status: 'Paused',
    createdBy: 'a.sharma',
    createdDate: '01-May-2025',
    env: 'Local Shell Process',
    command: 'bash /opt/truemigrate/scripts/retry_exceptions.sh --error 500 --limit 250',
    logPath: '/var/log/truemigrate/retry_exceptions.log',
    logs: [
      '[INFO] 2025-05-04 14:00:00 - Loading failed records index...',
      '[INFO] Found 250 entries marked with Error Code 500.',
      '[INFO] Launching exception parser...',
      '[INFO] Processing row 1/250 (DocID: 10450)...',
      '[WARN] Warning: Target Content Engine returned busy signal. Throttling execution.',
      '[INFO] Executing sleep for 5 seconds...',
      '[INFO] Process PAUSED by user administrative request.'
    ]
  },
  {
    id: '5',
    name: 'IMP_JOB_001',
    category: 'import',
    type: 'Bulk',
    source: 'SharePoint',
    dateRange: '01-May-2025 – 07-May-2025',
    filterCriteria: 'Import to Folder: /Imported',
    records: 8500,
    status: 'Pending',
    createdBy: 'system',
    createdDate: '01-May-2025',
    env: 'Linux RHEL 8 (192.168.1.105)',
    command: 'bash /opt/truemigrate/scripts/import_p8_bulk.sh --dest "/Imported" --batch 8500',
    logPath: '/var/log/truemigrate/import_job_001.log',
    logs: [
      '[INFO] Job is in queue. Waiting for extraction processes to finalize before starting import.'
    ]
  },
  {
    id: '6',
    name: 'IMP_ADHOC_001',
    category: 'import',
    type: 'Ad-hoc',
    source: 'Local File System',
    dateRange: 'Specific Records',
    filterCriteria: 'File = test_upload.zip',
    records: 1,
    status: 'Completed',
    createdBy: 'r.iyer',
    createdDate: '02-May-2025',
    env: 'Local Shell Process',
    command: 'unzip /opt/truemigrate/uploads/test_upload.zip -d /opt/truemigrate/imports/',
    logPath: '/var/log/truemigrate/import_adhoc_001.log',
    logs: [
      '[INFO] 2025-05-05 09:00:00 - Starting import zip decompression...',
      '[INFO] File size: 154 MB.',
      '[INFO] Inflating: doc_01.pdf',
      '[INFO] Inflating: metadata.xml',
      '[INFO] Decompression complete.',
      '[INFO] Running integrity check on decompressed archives...',
      '[INFO] Integrity check PASS.',
      '[INFO] Job COMPLETED successfully at 2025-05-05 09:02:10.'
    ]
  }
];
