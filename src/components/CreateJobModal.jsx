import React, { useState, useEffect } from 'react';
import { X, Cpu, Terminal, Sliders, AlertTriangle, Info, Play, Save, Upload } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useConfig } from '../context/ConfigContext';
import { JOB_CATEGORIES } from '../config/jobsConfig';
import {
  CASE_IMPORT_JAR_PATH,
  CASE_EXTRACTION_JAR_PATH,
  CASE_TRANSFORMATION_JAR_PATH,
  FILENET_MIGRATOR_CMD,
  IS_EXTRACTION_SCRIPT,
  LOG_DIRECTORY_PATH
} from '../config/envConfig';

export default function CreateJobModal({ isOpen, onClose, onCreateJob, initialCategory = 'import', existingJobs = [], jobToEdit = null }) {
  const { showAlert } = useAlert();
  const { activeExecPath, sourceTargetConfigs } = useConfig();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(initialCategory || 'import');

  // Under Import Jobs: 'case' (Case Migration - Java) vs 'is' (IS Migration - .NET FileNet)
  const [importTarget, setImportTarget] = useState('case');

  const [type, setType] = useState('Standard'); // Standard, Ad-hoc, Exception
  const [source, setSource] = useState('FileNet P8');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [docIds, setDocIds] = useState(''); // Default empty for Ad-hoc text file pick on server
  const [filterCriteria, setFilterCriteria] = useState('Standard Run');
  
  // Load server environment paths & settings dynamically from ConfigContext (with envConfig fallbacks)
  const serverEnvName = 'Linux Migration Server';
  const caseJarPath = activeExecPath?.caseImportJar || CASE_IMPORT_JAR_PATH;
  const caseExtractJarPath = activeExecPath?.caseExtractionJar || CASE_EXTRACTION_JAR_PATH;
  const caseTransformJarPath = activeExecPath?.caseTransformationJar || CASE_TRANSFORMATION_JAR_PATH;
  const filenetCmd = activeExecPath?.filenetMigratorCmd || FILENET_MIGRATOR_CMD;
  const isExtractScript = activeExecPath?.isExtractionScript || IS_EXTRACTION_SCRIPT;
  const logDir = activeExecPath?.logDirectoryPath || LOG_DIRECTORY_PATH;

  const [env, setEnv] = useState(serverEnvName);

  // Processing Parameters (Empty by default for user input)
  const [workerThreads, setWorkerThreads] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [retryCount, setRetryCount] = useState('');
  const [retryInterval, setRetryInterval] = useState('');

  // Migration Options Checkboxes
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [preserveCreatedDate, setPreserveCreatedDate] = useState(true);
  const [preserveModifiedDate, setPreserveModifiedDate] = useState(true);
  const [validateChecksum, setValidateChecksum] = useState(true);
  const [continueOnError, setContinueOnError] = useState(false);
  const [generateAudit, setGenerateAudit] = useState(true);

  // Command state
  const [command, setCommand] = useState('');
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);

  const [modificationReason, setModificationReason] = useState('');

  // Real-time unique name check
  const isDuplicateName = name.trim() !== '' && (!jobToEdit || jobToEdit.name?.trim().toUpperCase() !== name.trim().toUpperCase()) && existingJobs.some(
    j => j.name && j.name.trim().toUpperCase() === name.trim().toUpperCase()
  );

  const isCompleted = jobToEdit?.status === 'Completed';

  const hasChanges = isCompleted ? (
    name !== jobToEdit.name ||
    category !== jobToEdit.category ||
    importTarget !== jobToEdit.importTarget ||
    type !== jobToEdit.type ||
    startDate !== (jobToEdit.startDate || '') ||
    endDate !== (jobToEdit.endDate || '') ||
    docIds !== (jobToEdit.docIds || '') ||
    filterCriteria !== jobToEdit.filterCriteria ||
    command !== jobToEdit.command
  ) : true;

  const isSaveDisabled = isDuplicateName || (isCompleted && (!hasChanges || !modificationReason.trim()));

  useEffect(() => {
    if (jobToEdit) {
      setName(jobToEdit.name || '');
      setCategory(jobToEdit.category || initialCategory || 'import');
      setType(jobToEdit.type || 'Standard');

      const jobSource = jobToEdit.source || 'FileNet P8';
      setSource(jobSource);

      // Use the explicitly saved importTarget if available, otherwise guess from source
      const defaultImportTarget = jobToEdit.configuration?.importTarget || jobToEdit.importTarget || (jobSource.includes('IBM Image Services') ? 'is' : 'case');
      setImportTarget(defaultImportTarget);

      let parsedStart = '';
      let parsedEnd = '';
      let parsedDocIds = '';

      if (jobToEdit.dateRange) {
        if (jobToEdit.dateRange.includes(' – ')) {
          const parts = jobToEdit.dateRange.split(' – ');
          parsedStart = parts[0];
          parsedEnd = parts[1];
        } else if (jobToEdit.dateRange.startsWith('DocIDs: ')) {
          parsedDocIds = jobToEdit.dateRange.substring(8);
        }
      }

      setStartDate(jobToEdit.configuration?.startDate || parsedStart);
      setEndDate(jobToEdit.configuration?.endDate || parsedEnd);
      setDocIds(jobToEdit.configuration?.docIds || parsedDocIds);

      setWorkerThreads(jobToEdit.configuration?.workerThreads || jobToEdit.workerThreads || '');
      setBatchSize(jobToEdit.configuration?.batchSize || jobToEdit.batchSize || '');
      setRetryCount(jobToEdit.configuration?.retryCount || jobToEdit.retryCount || '');
      setRetryInterval(jobToEdit.configuration?.retryInterval || jobToEdit.retryInterval || '');

      setPreserveMetadata(jobToEdit.configuration?.preserveMetadata ?? jobToEdit.preserveMetadata ?? true);
      setPreserveCreatedDate(jobToEdit.configuration?.preserveCreatedDate ?? jobToEdit.preserveCreatedDate ?? true);
      setPreserveModifiedDate(jobToEdit.configuration?.preserveModifiedDate ?? jobToEdit.preserveModifiedDate ?? true);
      setValidateChecksum(jobToEdit.configuration?.validateChecksum ?? jobToEdit.validateChecksum ?? true);
      setContinueOnError(jobToEdit.configuration?.continueOnError ?? jobToEdit.continueOnError ?? false);
      setGenerateAudit(jobToEdit.configuration?.generateAudit ?? jobToEdit.generateAudit ?? true);

      setCommand(jobToEdit.command || '');
      setIsManuallyEdited(true); // Prevent auto-generation from overriding saved command
    } else if (initialCategory) {
      setName('');
      setCategory(initialCategory);
      setIsManuallyEdited(false);
      if (initialCategory === 'import') {
        setImportTarget('case');
        setType('Standard');
        setStartDate('');
        setEndDate('');
        setDocIds('');
      } else if (initialCategory === 'extraction') {
        setType('Standard');
      }
      setWorkerThreads('');
      setBatchSize('');
      setRetryCount('');
      setRetryInterval('');
      setPreserveMetadata(true);
      setPreserveCreatedDate(true);
      setPreserveModifiedDate(true);
      setValidateChecksum(true);
      setContinueOnError(false);
      setGenerateAudit(true);
      setCommand('');
      setModificationReason('');
      setSource('FileNet P8');
    }
  }, [initialCategory, isOpen, jobToEdit]);

  // Handle importTarget reset defaults (Target System, Dates)
  // Skip reset when loading from jobToEdit to preserve saved values
  useEffect(() => {
    if (jobToEdit) return; // Don't reset when editing
    if (category === 'import') {
      if (importTarget === 'case') {
        setStartDate('');
        setEndDate('');
      } else { // IS Migration
        setStartDate('');
        setEndDate('');
      }
    }
  }, [importTarget, category]);

  // Handle dynamic filterCriteria based on type/docIds
  useEffect(() => {
    if (category === 'import') {
      if (importTarget === 'case') {
        if (type === 'Exception') {
          setFilterCriteria('Status = Failed');
        } else {
          // Standard
          setFilterCriteria((startDate && endDate) ? 'Status = Pending' : 'Standard');
        }
      } else { // IS Migration
        if (type === 'Ad-hoc') setFilterCriteria(docIds.trim() ? 'docids=' + docIds.trim() : 'Ad-hoc Text File');
        else setFilterCriteria(type === 'Exception' ? 'Status = Failed' : 'Status = Pending');
      }
    }
  }, [importTarget, category, type, docIds]);

  // Dynamically update shell command template when fields change
  useEffect(() => {
    if (isManuallyEdited) return;

    if (category === 'import') {
      if (importTarget === 'case') {
        const safeJarPath = caseJarPath.startsWith('"') && caseJarPath.endsWith('"') ? caseJarPath : `"${caseJarPath.replace(/^"|"$/g, '')}"`;
        if (type === 'Exception') {
          setCommand(`java -jar ${safeJarPath} --status=Failed`);
        } else { // Standard
          if (startDate && endDate) {
            const formattedStart = startDate.includes('-') && startDate.split('-')[0].length === 2
              ? startDate.split('-').reverse().join('-')
              : (startDate || '');
            const formattedEnd = endDate.includes('-') && endDate.split('-')[0].length === 2
              ? endDate.split('-').reverse().join('-')
              : (endDate || '');
            setCommand(`java -jar ${safeJarPath} --status=Pending --startDate=${formattedStart} --endDate=${formattedEnd}`);
          } else {
            setCommand(`java -jar ${safeJarPath}`);
          }
        }
      } else {
        // .NET IS Migration
        const startParamNET = startDate ? ` startdate=${startDate}` : '';
        const endParamNET = endDate ? ` enddate=${endDate}` : '';
        if (type === 'Standard') {
          setCommand(`${filenetCmd} status=Pending${startParamNET}${endParamNET}`);
        } else if (type === 'Ad-hoc') {
          const trimmedIds = docIds ? docIds.trim() : '';
          const docParam = trimmedIds ? ` docids=${trimmedIds}` : '';
          setCommand(`${filenetCmd} status=Adhoc${docParam}`);
        } else if (type === 'Exception') {
          setCommand(`${filenetCmd} status=Failed${startParamNET}${endParamNET}`);
        }
      }
    } else if (category === 'extraction') {
      if (importTarget === 'case') {
        const safeExtractJarPath = caseExtractJarPath.startsWith('"') && caseExtractJarPath.endsWith('"') ? caseExtractJarPath : `"${caseExtractJarPath.replace(/^"|"$/g, '')}"`;
        setCommand(`java -jar ${safeExtractJarPath}`);
      } else {
        setCommand(isExtractScript);
      }
    } else if (category === 'transformation') {
      const safeTransformJarPath = caseTransformJarPath.startsWith('"') && caseTransformJarPath.endsWith('"') ? caseTransformJarPath : `"${caseTransformJarPath.replace(/^"|"$/g, '')}"`;
      setCommand(`java -jar ${safeTransformJarPath}`);
    }
  }, [name, category, importTarget, type, startDate, endDate, docIds, isManuallyEdited, caseJarPath, filenetCmd, isExtractScript]);

  // Early return AFTER all hooks - hooks must always run in the same order
  if (!isOpen) return null;

  const handleSubmit = (e, autoStart = false) => {
    if (e && e.preventDefault) e.preventDefault();

    if (isDuplicateName) {
      showAlert(`Job name "${name}" already exists! Job names must be unique.`, 'Validation Error', 'error');
      return;
    }

    if (category === 'import' && importTarget === 'case' && type === 'Standard') {
      if ((startDate && !endDate) || (!startDate && endDate)) {
        showAlert("Please provide both Start Date and End Date, or leave both empty for a full run.", "Validation Error", "error");
        return;
      }
    }

    const finalName = name.trim() || ('JOB_' + Date.now().toString().slice(-4));

    let dateRangeStr = `${startDate} – ${endDate}`;

    if (category === 'import') {
      if (importTarget === 'case') {
        if (type === 'Standard') {
          dateRangeStr = (startDate && endDate) ? `${startDate} – ${endDate}` : 'N/A (Standard Run)';
        } else if (type === 'Exception') {
          dateRangeStr = 'N/A (Exception)';
        }
      } else { // IS Migration
        if (type === 'Standard') {
          dateRangeStr = `${startDate} – ${endDate}`;
        } else if (type === 'Ad-hoc') {
          const count = docIds.trim() ? docIds.split(',').length : 0;
          dateRangeStr = count > 0 ? `${count} Document(s) Selected` : 'Server Text File';
        } else if (type === 'Exception') {
          dateRangeStr = 'N/A (Exception)';
        }
      }
    }

    const migrationSource = source || (category === 'import'
      ? 'FileNet P8'
      : 'IBM Image Services');

    onCreateJob({
      name: finalName,
      modificationReason,
      category: category || 'import',
      type,
      source: migrationSource,
      dateRange: dateRangeStr,
      filterCriteria,
      records: 0,
      recordsProcessed: 0,
      status: autoStart ? 'Running' : 'Pending',
      createdBy: 'admin',
      env,
      command: command || 'java -jar target/caseingestion-0.0.1.jar',
      processPid: null,

      // Detailed Config payload as nested JSON
      configuration: {
        importTarget,
        startDate,
        endDate,
        docIds,
        workerThreads: workerThreads ? parseInt(workerThreads) : null,
        batchSize: batchSize ? parseInt(batchSize) : null,
        retryCount: retryCount ? parseInt(retryCount) : null,
        retryInterval: retryInterval ? parseInt(retryInterval) : null,
        preserveMetadata,
        preserveCreatedDate,
        preserveModifiedDate,
        validateChecksum,
        continueOnError,
        generateAudit
      }
    });

    onClose();
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '6px',
    display: 'block'
  };

  const inputStyle = {
    width: '100%',
    padding: '7px 10px',
    border: isDuplicateName ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    color: '#1e293b',
    background: isDuplicateName ? '#fef2f2' : '#fff',
    transition: 'all 0.15s'
  };

  const sectionDividerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '11px',
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '6px'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
    }}>
      <div style={{
        width: '680px', maxH: '90vh', background: 'white', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
        border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column'
      }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Create Import Job</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Configure a new target data import job</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '72vh' }}>

          {/* Row 1: Target & Run Type (Hidden for Transformation) */}
              {category !== 'transformation' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Migration Type</label>
                    <select
                      value={importTarget}
                      onChange={(e) => {
                        const targetVal = e.target.value;
                        setImportTarget(targetVal);
                        setType('Standard');
                        setIsManuallyEdited(false);
                      }}
                      style={inputStyle}
                    >
                      <option value="case">Case Migration</option>
                      <option value="is">Document Migration</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Migration Mode</label>
                    <select
                      value={type}
                      onChange={(e) => { setType(e.target.value); setIsManuallyEdited(false); }}
                      style={inputStyle}
                    >
                      {category === 'import' && importTarget === 'case' ? (
                        <>
                          <option value="Standard">Standard</option>
                          <option value="Exception">Exception</option>
                        </>
                      ) : (
                        <>
                          <option value="Standard">Standard</option>
                          <option value="Ad-hoc">Ad-hoc</option>
                          <option value="Exception">Exception</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Row 2: Job Name & Target System */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Job Name (Must be Unique)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      category === 'import'
                        ? (importTarget === 'case' ? 'e.g. Case_IMP_JOB_001' : 'e.g. IS_IMP_JOB_001')
                        : category === 'transformation'
                          ? 'e.g. Case_TRF_JOB_001'
                          : (importTarget === 'case' ? 'e.g. Case_EXT_JOB_001' : 'e.g. IS_EXT_JOB_001')
                    }
                    style={inputStyle}
                    required
                  />
                  {isDuplicateName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '10.5px', fontWeight: 'bold', marginTop: '4px' }}>
                      <AlertTriangle size={12} /> A job named "{name}" already exists. Job names must be unique!
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Source System</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="FileNet P8">FileNet P8</option>
                    <option value="IBM Image Services">IBM Image Services</option>
                    <option value="SharePoint">SharePoint</option>
                    <option value="Custom Repository">Custom Repository</option>
                    {(sourceTargetConfigs?.sourceConfigurations || []).map(sc => (
                      <option key={sc.id} value={sc.name}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Inputs based on Job Mode & Target */}
              {category === 'import' && importTarget === 'is' && type === 'Ad-hoc' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Document IDs (Comma-separated)</label>
                    <label style={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="file"
                        accept=".txt,.csv"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const content = evt.target.result;
                            const ids = content.split(/[\n\r,]+/).map(id => id.trim()).filter(id => id);
                            if (ids.length > 0) {
                              const currentIds = docIds.trim() ? docIds.split(',').map(i => i.trim()).filter(i => i) : [];
                              const newIds = Array.from(new Set([...currentIds, ...ids])).join(',');
                              setDocIds(newIds);
                              setIsManuallyEdited(false);
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = '';
                        }}
                      />
                      <Upload size={12} /> Load from File
                    </label>
                  </div>
                  <input
                    type="text"
                    value={docIds}
                    onChange={(e) => { setDocIds(e.target.value); setIsManuallyEdited(false); }}
                    style={inputStyle}
                    placeholder="e.g. 1111,2222,3333 or upload a text file"
                  />
                </div>
              ) : category === 'import' && importTarget === 'case' && type === 'Exception' ? null : (
                <>
                  <div style={sectionDividerStyle}>
                    <span>Date Range</span>
                    <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ ...labelStyle, textTransform: 'none', color: '#334155' }}>Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setIsManuallyEdited(false); }}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ ...labelStyle, textTransform: 'none', color: '#334155' }}>End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setIsManuallyEdited(false); }}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* SECTION: PROCESSING (Matching Screenshot) */}
              <div style={sectionDividerStyle}>
                <span>Processing</span>
                <span style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ ...labelStyle, textTransform: 'none', color: '#334155' }}>Worker Threads</label>
                  <input
                    type="number"
                    value={workerThreads}
                    onChange={(e) => setWorkerThreads(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ ...labelStyle, textTransform: 'none', color: '#334155' }}>Batch Size</label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ ...labelStyle, textTransform: 'none', color: '#334155' }}>Retry Count</label>
                  <input
                    type="number"
                    value={retryCount}
                    onChange={(e) => setRetryCount(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ ...labelStyle, textTransform: 'none', color: '#334155' }}>Retry Interval (sec)</label>
                  <input
                    type="number"
                    value={retryInterval}
                    onChange={(e) => setRetryInterval(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

          {isCompleted && hasChanges && (
            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Reason for Modification *</label>
              <textarea
                required
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1.5px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', minHeight: '60px' }}
                placeholder='Explain why you are modifying this completed job...'
              />
            </div>
          )}

          {/* Action Buttons (Matching Screenshot) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '7px 16px', background: 'white', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
            >
              Cancel
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={isSaveDisabled}
                style={{
                  padding: '7px 18px',
                  background: 'white',
                  color: isSaveDisabled ? '#cbd5e1' : '#1e293b',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Save size={14} /> Save
              </button>

              <button
                type="button"
                disabled={isSaveDisabled}
                onClick={(e) => handleSubmit(e, true)}
                style={{
                  padding: '7px 20px',
                  background: isSaveDisabled ? '#94a3b8' : '#2563eb',
                  color: 'white', border: 'none', borderRadius: '6px',
                  cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                }}
              >
                <Play size={13} style={{ fill: 'white' }} /> Save & Start
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
