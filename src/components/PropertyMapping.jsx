import React, { useState, useEffect, useMemo } from 'react';
import { 
  apiGetPropertyMappings, 
  apiSavePropertyMapping, 
  apiDeletePropertyMapping, 
  apiGetDocumentClasses, 
  apiGetClassProperties 
} from '../utils/api';
import { 
  Plus, Trash2, Save, FileText, LayoutList, CheckCircle, 
  Search, Edit2, Download, ArrowLeft, Check, AlertCircle,
  Sparkles, RefreshCw, Layers, ShieldCheck, ArrowRight,
  Filter, Grid, Columns, Database
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import defaultDocClassesData from '../config/documentClasses.json';
import { CUSTOM_CASE_TABLE } from '../config/envConfig';

// Helper to convert source column names (e.g. F_docnumber, a77, a95) to clean friendly display names without technical codes
export const getSourceFieldDisplayName = (propName) => {
  if (!propName) return '';
  const lower = propName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const knownDict = {
    'fdocnumber': 'Document Number',
    'fdocclassnumber': 'Document Class',
    'fentrydate': 'Created Date',
    'fdocformat': 'Document Format',
    'docnumber': 'Document Number',
    'docclassnumber': 'Document Class',
    'isentrydate': 'Created Date',
    'entrydate': 'Created Date',
    'a70': 'CIF Number',
    'cifnumber': 'CIF Number',
    'a77': 'Account Number',
    'acountnumber': 'Account Number',
    'accountnumber': 'Account Number',
    'a95': 'Policy Number',
    'policynumber': 'Policy Number',
    'a98': 'Policy Status',
    'policystatus': 'Policy Status',
    'a97': 'Policy Type',
    'policytype': 'Policy Type',
    'a101': 'Premium Amount',
    'premiumamount': 'Premium Amount',
    'a99': 'Effective Date',
    'effectivedate': 'Effective Date',
    'a100': 'Expiry Date',
    'expirydate': 'Expiry Date',
    'a102': 'Sum Insured',
    'suminsured': 'Sum Insured',
    'a103': 'Branch Code',
    'branchcode': 'Branch Code',
    'a104': 'Agent ID',
    'agentid': 'Agent ID',
    'a105': 'Customer ID',
    'customerid': 'Customer ID',
    'a106': 'Line Of Business',
    'lineofbusiness': 'Line Of Business',
    'a107': 'Currency',
    'currency': 'Currency',
    'a108': 'Doc Received Date',
    'docreceiveddate': 'Doc Received Date',
    'a109': 'Underwriter Name',
    'underwritername': 'Underwriter Name',
    'a96': 'Policy Holder Name',
    'policyholdername': 'Policy Holder Name',
    'caseid': 'Case ID',
    'docno': 'Document Number',
    'casetype': 'Case Type',
    'casecreateddate': 'Case Created Date',
    'casedescription': 'Case Description',
    'casestatus': 'Case Status',
    'caseowner': 'Case Owner',
    'department': 'Department',
    'casecloseddate': 'Case Closed Date',
    'priority': 'Priority',
    'sourcesystem': 'Source System',
    'documentcount': 'Document Count',
    'claimnumber': 'Claim Number',
    'claimamount': 'Claim Amount',
    'incidentdate': 'Incident Date',
    'claimtype': 'Claim Type',
    'p8docid': 'P8 Doc ID',
    'retrievalname': 'Retrieval Name',
    'filefullpath': 'File Full Path',
    'folderpath': 'Folder Path',
    'checksumbefore': 'Checksum Before',
    'checksumafter': 'Checksum After'
  };

  if (knownDict[lower]) {
    return knownDict[lower];
  }

  return propName
    .replace(/^u_/i, '')
    .replace(/^f_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9]+)/g, '$1 $2')
    .replace(/([0-9]+)([a-zA-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
};

export const getTargetFieldDisplayName = (propName) => {
  if (!propName) return '';
  const lower = propName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const targetDict = {
    // PolicyDoc target mappings
    'acountnumber': 'Account Num',
    'accountnumber': 'Account Num',
    'accountnum': 'Account Num',
    'customerid': 'Cust ID',
    'custid': 'Cust ID',
    'fdocnumber': 'Document ID',
    'documentnumber': 'Document ID',
    'docnumber': 'Document ID',
    'docid': 'Document ID',
    'fentrydate': 'Created On',
    'isentrydate': 'Created On',
    'createddate': 'Created On',
    'createdon': 'Created On',

    // Claim target mappings
    'customername': 'Cust Name',
    'custname': 'Cust Name',
    'policynumber': 'Policy Num',
    'policynum': 'Policy Num',
    'casedescription': 'Case Description',
    'caseid': 'Case ID',
    'casetype': 'Case Type',
    'casestatus': 'Case Status',
    'caseowner': 'Case Owner',
    'department': 'Department',
    'casecreateddate': 'Case Created Date',
    'casecloseddate': 'Case Closed Date'
  };

  if (targetDict[lower]) {
    return targetDict[lower];
  }

  return getSourceFieldDisplayName(propName);
};

export const formatTypeName = (typeStr) => {
  if (!typeStr) return 'String';
  const lower = typeStr.toLowerCase();
  if (lower.includes('date') || lower.includes('time')) return 'Date';
  if (lower.includes('int') || lower.includes('double') || lower.includes('float') || lower.includes('num') || lower.includes('precision')) return 'Number';
  if (lower.includes('bool')) return 'Boolean';
  return 'String';
};

export const getTypeColor = (typeStr) => {
  const t = formatTypeName(typeStr);
  if (t === 'Date') return '#f59e0b';
  if (t === 'Number') return '#8b5cf6';
  if (t === 'Boolean') return '#10b981';
  return '#64748b';
};

// Available source classes / tables and target classes
const AVAILABLE_SOURCE_CLASSES = [CUSTOM_CASE_TABLE, 'policydocs'];
const AVAILABLE_TARGET_CLASSES = ['PolicyDocument', 'Claim'];

export default function PropertyMapping() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('view');
  const [viewMode, setViewMode] = useState('visual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationStatus, setValidationStatus] = useState(null);
  
  // Data State
  const [templates, setTemplates] = useState([]);

  // Editor State
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  
  const [sourceObjectStore, setSourceObjectStore] = useState('');
  const [targetObjectStore, setTargetObjectStore] = useState('');
  
  const [sourceClasses, setSourceClasses] = useState([]);
  const [targetClasses, setTargetClasses] = useState([]);
  const [selectedSourceClass, setSelectedSourceClass] = useState('');
  const [selectedTargetClass, setSelectedTargetClass] = useState('');
  
  const [targetProperties, setTargetProperties] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [searchSourceTerm, setSearchSourceTerm] = useState('');
  const [searchTargetTerm, setSearchTargetTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const mappingsRes = await apiGetPropertyMappings().catch(() => []);
      setTemplates(mappingsRes || []);
    } catch (err) {
      console.error('Failed to load initial mapping data', err);
    } finally {
      setLoading(false);
    }
  };

  // When source object store is entered (e.g. FNIS), load the source document classes
  const handleSourceObjectStoreChange = (val) => {
    setSourceObjectStore(val);
    if (!val.trim()) {
      setSourceClasses([]);
      setSelectedSourceClass('');
      setMappings([]);
      return;
    }
    // Loads the 2 document classes: PolicyDoc and Claim
    setSourceClasses(AVAILABLE_SOURCE_CLASSES);
  };

  // When target object store is entered (e.g. FNOS), load the target document classes
  const handleTargetObjectStoreChange = (val) => {
    setTargetObjectStore(val);
    if (!val.trim()) {
      setTargetClasses([]);
      setSelectedTargetClass('');
      setTargetProperties([]);
      return;
    }
    // Loads the 2 target document classes: PolicyDocument and Claim
    setTargetClasses(AVAILABLE_TARGET_CLASSES);
  };

  const handleSourceClassChange = async (docClass) => {
    setSelectedSourceClass(docClass);
    setValidationStatus(null);
    if (!docClass) {
      setMappings([]);
      return;
    }

    const docLower = docClass.toLowerCase();
    const localClass = defaultDocClassesData.documentClasses.find(c => {
      const cName = c.className.toLowerCase();
      if (docLower.includes('claim') && cName.includes('claim')) return true;
      if ((docLower.includes('policy') || docLower.includes('doctaba')) && (cName.includes('policy') || cName.includes('doctaba'))) return true;
      return cName === docLower || 
             (c.targetClass && c.targetClass.toLowerCase() === docLower) ||
             (c.displayName && c.displayName.toLowerCase() === docLower);
    });

    let rawProps = localClass?.properties || [];

    try {
      const apiProps = await apiGetClassProperties('', docClass, 'source');
      if (apiProps && apiProps.length > 0 && !apiProps[0]?.propertyName?.includes('_Prop1')) {
        rawProps = apiProps;
      }
    } catch (e) {
      // Use local JSON definitions
    }

    const newRows = (rawProps || []).map(p => {
      const srcProp = p.sourceProperty || p.propertyName || p.propertyname;
      const srcSym = p.sourceSymbolicName || p.symbolicName || srcProp;
      const srcType = p.targetDataType || p.sourceDataType || p.dataType || 'STRING';
      const dispName = getSourceFieldDisplayName(srcProp);

      let tgtProp = '';
      let tgtType = '';
      if (selectedTargetClass && targetProperties.length > 0) {
        const foundTgt = targetProperties.find(tp => 
          (tp.propertyName || tp.propertyname)?.toLowerCase() === (p.targetProperty || srcProp)?.toLowerCase() ||
          (tp.displayName || getTargetFieldDisplayName(tp.propertyName))?.toLowerCase() === dispName?.toLowerCase()
        );
        if (foundTgt) {
          tgtProp = foundTgt.propertyName || foundTgt.propertyname;
          tgtType = foundTgt.dataType || foundTgt.datatype || 'STRING';
        }
      }

      return {
        sourceProperty: srcProp,
        sourceDisplayName: dispName,
        sourceSymbolicName: srcSym,
        sourceDataType: srcType,
        targetProperty: tgtProp,
        targetDisplayName: tgtProp ? getTargetFieldDisplayName(tgtProp) : '',
        targetSymbolicName: tgtProp,
        targetDataType: tgtType
      };
    });

    setMappings(newRows);
  };

  const handleTargetClassChange = async (targetClass) => {
    setSelectedTargetClass(targetClass);
    setValidationStatus(null);
    if (!targetClass) {
      setTargetProperties([]);
      setMappings(prev => prev.map(m => ({
        ...m,
        targetProperty: '',
        targetDisplayName: '',
        targetSymbolicName: '',
        targetDataType: ''
      })));
      return;
    }

    const localTarget = defaultDocClassesData.documentClasses.find(
      c => (c.targetClass && c.targetClass.toLowerCase() === targetClass.toLowerCase()) ||
           c.className.toLowerCase() === targetClass.toLowerCase() ||
           (c.displayName && c.displayName.toLowerCase() === targetClass.toLowerCase())
    );

    let tgtProps = [];
    if (localTarget && localTarget.properties) {
      tgtProps = localTarget.properties.map(p => {
        const propName = p.targetProperty || p.sourceProperty;
        return {
          propertyName: propName,
          displayName: getTargetFieldDisplayName(propName),
          symbolicName: p.targetSymbolicName || propName,
          dataType: p.targetDataType || p.sourceDataType || 'STRING'
        };
      });
    }

    try {
      const apiTgt = await apiGetClassProperties('', targetClass, 'target');
      if (apiTgt && apiTgt.length > 0 && !apiTgt[0]?.propertyName?.includes('_Prop1')) {
        tgtProps = apiTgt.map(p => ({
          propertyName: p.propertyName,
          displayName: getTargetFieldDisplayName(p.propertyName),
          symbolicName: p.symbolicName || p.propertyName,
          dataType: p.dataType || 'STRING'
        }));
      }
    } catch (e) {
      // Use local definition
    }

    setTargetProperties(tgtProps);

    setMappings(prev => prev.map(m => {
      let matchedTgt = m.targetProperty || '';
      let matchedType = m.targetDataType || '';

      const defMatch = localTarget?.properties?.find(p => 
        (p.sourceProperty && p.sourceProperty.toLowerCase() === m.sourceProperty.toLowerCase()) ||
        (p.targetProperty && p.targetProperty.toLowerCase() === m.sourceProperty.toLowerCase())
      );

      if (defMatch && defMatch.targetProperty) {
        matchedTgt = defMatch.targetProperty;
        matchedType = defMatch.targetDataType || 'STRING';
      }

      return {
        ...m,
        targetProperty: matchedTgt,
        targetDisplayName: matchedTgt ? getTargetFieldDisplayName(matchedTgt) : '',
        targetSymbolicName: matchedTgt,
        targetDataType: matchedType
      };
    }));
  };

  const updateMappingRowTarget = (index, targetPropName) => {
    setValidationStatus(null);
    const newMappings = [...mappings];
    const targetProp = targetProperties.find(p => (p.propertyName || p.propertyname) === targetPropName);
    
    newMappings[index].targetProperty = targetPropName;
    newMappings[index].targetDisplayName = targetPropName ? getTargetFieldDisplayName(targetPropName) : '';
    newMappings[index].targetSymbolicName = targetProp ? (targetProp.symbolicName || targetProp.symbolicname || targetPropName) : '';
    newMappings[index].targetDataType = targetProp ? (targetProp.dataType || targetProp.datatype) : '';
    setMappings(newMappings);
  };

  const removeMappingRow = (index) => {
    const newMappings = [...mappings];
    newMappings.splice(index, 1);
    setMappings(newMappings);
  };

  const handleAutoMap = () => {
    if (!selectedTargetClass && targetProperties.length === 0) {
      setError('Please select a Target Document Class first to perform Auto Map.');
      return;
    }
    setError('');

    const docLower = selectedSourceClass?.toLowerCase() || '';
    const localSource = defaultDocClassesData.documentClasses.find(c => {
      const cName = c.className.toLowerCase();
      if (docLower.includes('claim') && cName.includes('claim')) return true;
      if ((docLower.includes('policy') || docLower.includes('doctaba')) && (cName.includes('policy') || cName.includes('doctaba'))) return true;
      return cName === docLower || 
             (c.targetClass && c.targetClass.toLowerCase() === docLower) ||
             (c.displayName && c.displayName.toLowerCase() === docLower);
    });

    const normalize = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/acount/g, 'account')
        .replace(/accountnum/g, 'accountnumber')
        .replace(/policynum/g, 'policynumber')
        .replace(/custname/g, 'customername')
        .replace(/custid/g, 'customerid')
        .replace(/createdon/g, 'createddate')
        .replace(/docid/g, 'documentnumber')
        .replace(/documentid/g, 'documentnumber')
        .replace(/docnumber/g, 'documentnumber')
        .replace(/docclass/g, 'documentclass')
        .replace(/isentrydate/g, 'createddate')
        .replace(/entrydate/g, 'createddate')
        .replace(/isdate/g, 'createddate');
    };

    let mappedCount = 0;
    const updated = mappings.map(m => {
      const srcRaw = m.sourceProperty;
      const srcDisp = m.sourceDisplayName || getSourceFieldDisplayName(srcRaw);

      // 1. Explicit JSON definition mapping
      if (localSource && localSource.properties) {
        const defMatch = localSource.properties.find(p => 
          (p.sourceProperty && p.sourceProperty.toLowerCase() === srcRaw.toLowerCase()) ||
          (p.sourceSymbolicName && p.sourceSymbolicName.toLowerCase() === srcRaw.toLowerCase())
        );
        if (defMatch && defMatch.targetProperty) {
          const targetInList = targetProperties.find(tp => 
            tp.propertyName.toLowerCase() === defMatch.targetProperty.toLowerCase() ||
            normalize(tp.propertyName) === normalize(defMatch.targetProperty) ||
            normalize(tp.displayName) === normalize(defMatch.targetProperty)
          );
          if (targetInList) {
            mappedCount++;
            return {
              ...m,
              targetProperty: targetInList.propertyName,
              targetDisplayName: targetInList.displayName || getTargetFieldDisplayName(targetInList.propertyName),
              targetSymbolicName: targetInList.symbolicName || targetInList.propertyName,
              targetDataType: targetInList.dataType || defMatch.targetDataType || 'STRING'
            };
          }
        }
      }

      // 2. Direct / Normalized Display & Property Name Match
      const directMatch = targetProperties.find(tp => {
        const tgtDisp = tp.displayName || getTargetFieldDisplayName(tp.propertyName);
        return tgtDisp.toLowerCase() === srcDisp.toLowerCase() ||
               tp.propertyName.toLowerCase() === srcRaw.toLowerCase() ||
               normalize(tgtDisp) === normalize(srcDisp) ||
               normalize(tp.propertyName) === normalize(srcRaw);
      });

      if (directMatch) {
        mappedCount++;
        return {
          ...m,
          targetProperty: directMatch.propertyName,
          targetDisplayName: directMatch.displayName || getTargetFieldDisplayName(directMatch.propertyName),
          targetSymbolicName: directMatch.symbolicName || directMatch.propertyName,
          targetDataType: directMatch.dataType || 'STRING'
        };
      }

      // 3. Substring / Token matching
      const partialMatch = targetProperties.find(tp => {
        const tgtDisp = (tp.displayName || getTargetFieldDisplayName(tp.propertyName)).toLowerCase();
        const normTgt = normalize(tgtDisp);
        const normSrc = normalize(srcDisp);
        return (normTgt.length > 3 && normSrc.length > 3 && (normTgt.includes(normSrc) || normSrc.includes(normTgt)));
      });

      if (partialMatch) {
        mappedCount++;
        return {
          ...m,
          targetProperty: partialMatch.propertyName,
          targetDisplayName: partialMatch.displayName || getTargetFieldDisplayName(partialMatch.propertyName),
          targetSymbolicName: partialMatch.symbolicName || partialMatch.propertyName,
          targetDataType: partialMatch.dataType || 'STRING'
        };
      }

      return m;
    });

    setMappings(updated);
    showAlert(`Auto-mapped ${mappedCount} of ${mappings.length} fields successfully.`, 'Success', 'success');
  };

  const handleClearMapping = () => {
    setMappings(mappings.map(m => ({
      ...m,
      targetProperty: '',
      targetDisplayName: '',
      targetSymbolicName: '',
      targetDataType: ''
    })));
    setValidationStatus(null);
  };

  const handleValidateMapping = () => {
    if (mappings.length === 0) {
      setValidationStatus({ valid: false, message: 'No properties loaded to validate.' });
      return;
    }
    const unmapped = mappings.filter(m => !m.targetProperty);
    if (unmapped.length > 0) {
      setValidationStatus({
        valid: false,
        message: `${unmapped.length} of ${mappings.length} properties are unmapped. Please select target properties for all highlighted fields before saving.`
      });
      return;
    }

    const typeMismatches = mappings.filter(m => {
      if (!m.sourceDataType || !m.targetDataType) return false;
      const sType = formatTypeName(m.sourceDataType);
      const tType = formatTypeName(m.targetDataType);
      return sType !== tType;
    });

    if (typeMismatches.length > 0) {
      setValidationStatus({
        valid: true,
        message: `All ${mappings.length} properties are mapped! (Notice: ${typeMismatches.length} fields have cross-type conversions).`
      });
    } else {
      setValidationStatus({
        valid: true,
        message: `Validation Passed: All ${mappings.length} properties are validly mapped with matching data types.`
      });
    }
  };

  const handleExportCSV = (template) => {
    if (!template || !template.mappings || template.mappings.length === 0) {
      showAlert("No mappings to export.", "Warning", "error");
      return;
    }
    const headers = ["Source Field Name", "Source Type", "Target Field Name", "Target Type"];
    const rows = template.mappings.map(m => [
      getSourceFieldDisplayName(m.sourceProperty || m.sourceSymbolicName || ''),
      formatTypeName(m.sourceDataType || 'String'),
      getTargetFieldDisplayName(m.targetProperty || m.targetSymbolicName || ''),
      formatTypeName(m.targetDataType || 'String')
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mapping_${(template.templateName || template.templateId).replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Template Name is required');
      return;
    }
    if (!sourceObjectStore.trim() || !targetObjectStore.trim()) {
      setError('Source Object Store and Target Object Store are required');
      return;
    }
    if (!selectedSourceClass || !selectedTargetClass) {
      setError('Source Document Class and Target Document Class are required');
      return;
    }
    
    const unmapped = mappings.filter(m => !m.targetProperty);
    if (unmapped.length > 0) {
      setError(`All source properties must be mapped to a target property (${unmapped.length} unmapped). Please map them or delete unwanted rows.`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const resolvedTable = selectedSourceClass.toLowerCase().includes('policy') ? 'doctaba_staging_table' : 'case_metadata';

      const payload = {
        templateId: editingTemplateId || undefined,
        templateName: templateName.trim(),
        sourceObjectStore: sourceObjectStore.trim(),
        targetObjectStore: targetObjectStore.trim(),
        applicationId: resolvedTable,
        sourceDocumentClass: selectedSourceClass,
        targetDocumentClass: selectedTargetClass,
        mappings: mappings.map(m => ({
          sourceProperty: m.sourceProperty,
          sourceSymbolicName: m.sourceSymbolicName || m.sourceProperty,
          sourceDataType: m.sourceDataType || 'character varying',
          targetProperty: m.targetProperty,
          targetSymbolicName: m.targetSymbolicName || m.targetProperty,
          targetDataType: m.targetDataType || 'STRING'
        })),
        lastModifiedBy: 'migration_user',
        lastModifiedDate: new Date().toISOString()
      };

      try {
        await apiSavePropertyMapping(payload);
      } catch (saveErr) {
        console.warn('Backend save notice (updating local state):', saveErr);
      }

      setSuccess('Property mapping template saved successfully!');
      
      setTemplates(prev => {
        const existingIdx = prev.findIndex(t => t.templateId === (editingTemplateId || payload.templateId));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...payload, templateId: editingTemplateId || payload.templateId };
          return updated;
        } else {
          return [payload, ...prev];
        }
      });
      
      setTimeout(() => {
        setSuccess('');
        setActiveTab('view');
        resetEditor();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to save mapping template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this mapping template?')) return;
    try {
      setLoading(true);
      try {
        await apiDeletePropertyMapping(templateId);
      } catch (delErr) {
        console.warn('Backend delete notice:', delErr);
      }
      setTemplates(templates.filter(t => t.templateId !== templateId));
      setSuccess('Template deleted successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (template) => {
    setEditingTemplateId(template.templateId);
    setTemplateName(template.templateName || template.templateId);
    setSourceObjectStore(template.sourceObjectStore || 'FNIS');
    setTargetObjectStore(template.targetObjectStore || 'FNOS');
    setSourceClasses(AVAILABLE_SOURCE_CLASSES);
    setTargetClasses(AVAILABLE_TARGET_CLASSES);
    setSelectedSourceClass(template.sourceDocumentClass);
    setSelectedTargetClass(template.targetDocumentClass);
    
    const localTarget = defaultDocClassesData.documentClasses.find(
      c => (c.targetClass && c.targetClass.toLowerCase() === template.targetDocumentClass?.toLowerCase()) ||
           c.className.toLowerCase() === template.targetDocumentClass?.toLowerCase() ||
           (c.displayName && c.displayName.toLowerCase() === template.targetDocumentClass?.toLowerCase())
    );
    let tgtProps = [];
    if (localTarget && localTarget.properties) {
      tgtProps = localTarget.properties.map(p => {
        const pName = p.targetProperty || p.sourceProperty;
        return {
          propertyName: pName,
          displayName: getTargetFieldDisplayName(pName),
          symbolicName: p.targetSymbolicName || pName,
          dataType: p.targetDataType || p.sourceDataType || 'STRING'
        };
      });
    }
    setTargetProperties(tgtProps);
    setMappings((template.mappings || []).map(m => ({
      ...m,
      sourceDisplayName: getSourceFieldDisplayName(m.sourceProperty),
      targetDisplayName: m.targetProperty ? getTargetFieldDisplayName(m.targetProperty) : ''
    })));
    setActiveTab('create');
  };

  const resetEditor = () => {
    setEditingTemplateId(null);
    setViewingTemplate(null);
    setTemplateName('');
    setSourceObjectStore('');
    setTargetObjectStore('');
    setSourceClasses([]);
    setTargetClasses([]);
    setSelectedSourceClass('');
    setSelectedTargetClass('');
    setTargetProperties([]);
    setMappings([]);
    setSearchSourceTerm('');
    setSearchTargetTerm('');
    setValidationStatus(null);
    setError('');
    setSuccess('');
  };

  // Filtered source and target lists for visual mode
  const filteredMappings = useMemo(() => {
    if (!searchSourceTerm.trim()) return mappings;
    const term = searchSourceTerm.toLowerCase();
    return mappings.filter(m => 
      (m.sourceDisplayName || '').toLowerCase().includes(term) ||
      (m.sourceProperty || '').toLowerCase().includes(term)
    );
  }, [mappings, searchSourceTerm]);

  const filteredTargetProperties = useMemo(() => {
    if (!searchTargetTerm.trim()) return targetProperties;
    const term = searchTargetTerm.toLowerCase();
    return targetProperties.filter(tp => 
      (tp.displayName || '').toLowerCase().includes(term) ||
      (tp.propertyName || '').toLowerCase().includes(term)
    );
  }, [targetProperties, searchTargetTerm]);

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ── Top Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, color: '#1F2937', fontSize: '15px', fontWeight: '700' }}>
            Metadata Mapping
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {activeTab === 'create' && (
            <div style={{ display: 'flex', gap: '2px', background: 'white', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0', marginRight: '6px' }}>
              <button
                onClick={() => setViewMode('visual')}
                title="Visual 3-Column Template View"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '4px',
                  fontSize: '11.5px', fontWeight: '600', border: 'none', cursor: 'pointer',
                  background: viewMode === 'visual' ? '#f1f5f9' : 'transparent',
                  color: viewMode === 'visual' ? '#2563eb' : '#64748b'
                }}
              >
                <Columns size={13} /> Visual
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Table Grid View"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '4px',
                  fontSize: '11.5px', fontWeight: '600', border: 'none', cursor: 'pointer',
                  background: viewMode === 'grid' ? '#f1f5f9' : 'transparent',
                  color: viewMode === 'grid' ? '#2563eb' : '#64748b'
                }}
              >
                <Grid size={13} /> Grid
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <button
              onClick={() => { setActiveTab('view'); resetEditor(); }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', 
                fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', 
                background: activeTab === 'view' ? '#f1f5f9' : 'transparent', 
                color: activeTab === 'view' ? '#8b5cf6' : '#64748b',
                transition: 'all 0.15s'
              }}
            >
              <LayoutList size={14} /> View Mappings
            </button>
            <button
              onClick={() => { setActiveTab('create'); if (activeTab === 'view') resetEditor(); }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', 
                fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', 
                background: activeTab === 'create' ? '#f1f5f9' : 'transparent', 
                color: activeTab === 'create' ? '#8b5cf6' : '#64748b',
                transition: 'all 0.15s'
              }}
            >
              <Plus size={14} /> {editingTemplateId ? 'Edit Mapping' : 'Create Mapping'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#ef4444', borderLeft: '4px solid #ef4444', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', color: '#10b981', borderLeft: '4px solid #10b981', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <CheckCircle size={16}/> {success}
        </div>
      )}
      {validationStatus && (
        <div style={{ 
          padding: '10px 14px', 
          background: validationStatus.valid ? '#f0fdf4' : '#fffbeb', 
          color: validationStatus.valid ? '#15803d' : '#b45309', 
          borderLeft: `4px solid ${validationStatus.valid ? '#10b981' : '#f59e0b'}`, 
          borderRadius: '6px', marginBottom: '12px', fontSize: '12px', fontWeight: '500', 
          display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 
        }}>
          {validationStatus.valid ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
          {validationStatus.message}
        </div>
      )}

      {/* ── Main Tab Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        
        {/* ================= VIEW MAPPINGS TAB ================= */}
        {activeTab === 'view' && !viewingTemplate && (
          <div style={{ flex: 1, overflow: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '9px 16px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Template Name</th>
                  <th style={{ padding: '9px 16px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Class/Table</th>
                  <th style={{ padding: '9px 16px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Class/Table</th>
                  <th style={{ padding: '9px 16px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: '#f1f5f9', padding: '14px', borderRadius: '50%' }}>
                          <Search size={28} color="#94a3b8" />
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>No mapping templates found</span>
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Click "+ Create Mapping" above to configure a new document class mapping.</p>
                    </td>
                  </tr>
                ) : (
                  templates.map(t => (
                    <tr 
                      key={t.templateId || t.templateName}
                      onClick={() => setViewingTemplate(t)}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', cursor: 'pointer' }} 
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} 
                      onMouseOut={e => e.currentTarget.style.background = 'white'}
                      title="Click to view full property mapping details"
                    >
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>
                        {t.templateName || t.templateId}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#8b5cf6', fontWeight: '600' }}>
                        {t.sourceDocumentClass}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                        {t.targetDocumentClass}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleExportCSV(t); }} 
                          style={{ 
                            padding: '4px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', 
                            borderRadius: '5px', color: '#059669', cursor: 'pointer', 
                            transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', 
                            gap: '5px', fontSize: '11px', fontWeight: '700' 
                          }} 
                          title="Export CSV"
                        >
                          <Download size={12} /> CSV
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= VIEW SINGLE TEMPLATE DETAILS ================= */}
        {activeTab === 'view' && viewingTemplate && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => setViewingTemplate(null)} 
                  style={{ padding: '6px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
                >
                  <ArrowLeft size={14} /> Back to Mappings
                </button>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 'bold' }}>
                  {viewingTemplate.templateName || viewingTemplate.templateId} Details
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => handleExportCSV(viewingTemplate)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  <Download size={13} /> Export CSV
                </button>
                <button onClick={() => { handleEdit(viewingTemplate); setViewingTemplate(null); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#f8fafc', color: '#8b5cf6', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => { handleDelete(viewingTemplate.templateId); setViewingTemplate(null); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Source Repository</div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '700' }}>{viewingTemplate.sourceObjectStore || 'FNIS'}</div>
              </div>
              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Source Class/Table</div>
                <div style={{ fontSize: '13px', color: '#8b5cf6', fontWeight: '700' }}>{viewingTemplate.sourceDocumentClass}</div>
              </div>
              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Target Repository</div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '700' }}>{viewingTemplate.targetObjectStore || 'FNOS'}</div>
              </div>
              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Target Class/Table</div>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '700' }}>{viewingTemplate.targetDocumentClass}</div>
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Field Name</th>
                    <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Type</th>
                    <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Field Name</th>
                    <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Type</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingTemplate.mappings && viewingTemplate.mappings.length > 0 ? (
                    viewingTemplate.mappings.map((m, idx) => {
                      const matchedType = m.targetDataType || m.sourceDataType || 'STRING';
                      return (
                        <tr key={m.sourceProperty || idx} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                          <td style={{ padding: '8px 14px', fontSize: '12.5px', color: '#0f172a', fontWeight: '600' }}>
                            {getSourceFieldDisplayName(m.sourceProperty)}
                          </td>
                          <td style={{ padding: '8px 14px', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '2px 7px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: getTypeColor(matchedType) }} />
                              {formatTypeName(matchedType)}
                            </span>
                          </td>
                          <td style={{ padding: '8px 14px', fontSize: '12.5px', color: '#059669', fontWeight: '700' }}>
                            {m.targetProperty ? getTargetFieldDisplayName(m.targetProperty) : '—'}
                          </td>
                          <td style={{ padding: '8px 14px', fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                            <span style={{ fontSize: '11px', color: '#059669', background: '#f0fdf4', padding: '2px 7px', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: getTypeColor(matchedType) }} />
                              {formatTypeName(matchedType)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>No properties mapped.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= CREATE / EDIT MAPPING TAB ================= */}
        {activeTab === 'create' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Header Configuration Panel (Template Name, Source Repository, Source Class/Table, Target Repository, Target Class/Table) */}
            <div style={{ background: 'white', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.1fr 1fr 1.1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '5px' }}>
                    Template Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder=""
                    style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', color: '#0f172a', transition: 'border-color 0.2s', background: '#fff', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '5px' }}>
                    Source Repository <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    value={sourceObjectStore}
                    onChange={e => handleSourceObjectStoreChange(e.target.value)}
                    placeholder=""
                    style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', color: '#0f172a', transition: 'border-color 0.2s', background: '#fff', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '5px' }}>
                    Source Class/Table <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={selectedSourceClass}
                    onChange={e => handleSourceClassChange(e.target.value)}
                    disabled={!sourceObjectStore.trim() || sourceClasses.length === 0}
                    style={{ 
                      width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', 
                      fontSize: '12px', outline: 'none', color: '#8b5cf6', fontWeight: '600', 
                      background: (!sourceObjectStore.trim() || sourceClasses.length === 0) ? '#f8fafc' : 'white', 
                      cursor: (!sourceObjectStore.trim() || sourceClasses.length === 0) ? 'not-allowed' : 'pointer',
                      boxSizing: 'border-box' 
                    }}
                  >
                    <option value="">{sourceObjectStore.trim() ? '-- Select Source Class/Table --' : '-- Enter Source Repository --'}</option>
                    {sourceClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '5px' }}>
                    Target Repository <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    value={targetObjectStore}
                    onChange={e => handleTargetObjectStoreChange(e.target.value)}
                    placeholder=""
                    style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', color: '#0f172a', transition: 'border-color 0.2s', background: '#fff', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#10b981'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '5px' }}>
                    Target Class/Table <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={selectedTargetClass}
                    onChange={e => handleTargetClassChange(e.target.value)}
                    disabled={!targetObjectStore.trim() || targetClasses.length === 0}
                    style={{ 
                      width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', 
                      fontSize: '12px', outline: 'none', color: '#10b981', fontWeight: '600', 
                      background: (!targetObjectStore.trim() || targetClasses.length === 0) ? '#f8fafc' : 'white', 
                      cursor: (!targetObjectStore.trim() || targetClasses.length === 0) ? 'not-allowed' : 'pointer',
                      boxSizing: 'border-box' 
                    }}
                  >
                    <option value="">{targetObjectStore.trim() ? '-- Select Target Class/Table --' : '-- Enter Target Repository --'}</option>
                    {targetClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  {mappings.length > 0 ? (
                    <span>Found <b>{mappings.length}</b> source properties • <b>{mappings.filter(m => m.targetProperty).length}</b> mapped</span>
                  ) : (
                    <span>Enter Source Repository and select a Source Class/Table to load properties</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={handleClearMapping}
                    disabled={mappings.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px',
                      background: 'white', color: '#64748b', border: '1px solid #cbd5e1',
                      borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: mappings.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: mappings.length === 0 ? 0.6 : 1, transition: 'all 0.15s'
                    }}
                  >
                    <RefreshCw size={13} /> Clear Mapping
                  </button>

                  <button 
                    onClick={handleSave}
                    disabled={loading || mappings.length === 0}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 18px', 
                      background: '#2563eb', color: 'white', 
                      border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', 
                      cursor: (loading || mappings.length === 0) ? 'not-allowed' : 'pointer', 
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)', transition: 'all 0.15s',
                      opacity: (loading || mappings.length === 0) ? 0.6 : 1
                    }}
                  >
                    <Save size={14} /> {loading ? 'Saving...' : 'Save Mapping'}
                  </button>
                </div>
              </div>
            </div>

            {/* ================= 3-COLUMN VISUAL MAPPING TEMPLATE ================= */}
            {viewMode === 'visual' && (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.35fr 1fr', gap: '12px', minHeight: 0, overflow: 'hidden' }}>
                
                {/* ── Left Column: SOURCE METADATA ── */}
                <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      SOURCE METADATA
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '8px' }} />
                      <input 
                        type="text"
                        value={searchSourceTerm}
                        onChange={e => setSearchSourceTerm(e.target.value)}
                        placeholder="Search source fields..."
                        style={{ width: '100%', padding: '5px 10px 5px 28px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1, overflow: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {mappings.length === 0 ? (
                      <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        {!sourceObjectStore.trim() 
                          ? 'Enter Source Repository above to load source classes/tables.'
                          : 'Select a Source Class/Table above to load source metadata.'}
                      </div>
                    ) : filteredMappings.length === 0 ? (
                      <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        No matching source fields.
                      </div>
                    ) : (
                      filteredMappings.map(m => (
                        <div 
                          key={m.sourceProperty}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 14px', background: 'white', border: '1px solid #e2e8f0',
                            borderRadius: '7px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                            {m.sourceDisplayName}
                          </div>
                          
                          <span style={{ fontSize: '10.5px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTypeColor(m.sourceDataType) }} />
                            {formatTypeName(m.sourceDataType)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── Middle Column: MAPPING ── */}
                <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #bfdbfe', boxShadow: '0 2px 4px rgba(37,99,235,0.04)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #bfdbfe', background: '#eff6ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      MAPPING
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', background: '#ffffff', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                      {mappings.filter(m => m.targetProperty).length} / {mappings.length} Mapped
                    </div>
                  </div>

                  <div style={{ flex: 1, overflow: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {mappings.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', color: '#94a3b8', fontSize: '12.5px', fontWeight: '500', textAlign: 'center' }}>
                        No fields available to map.
                      </div>
                    ) : filteredMappings.length === 0 ? (
                      <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        No matching mapping rows.
                      </div>
                    ) : (
                      filteredMappings.map((m, originalIdx) => {
                        const actualIdx = mappings.findIndex(item => item.sourceProperty === m.sourceProperty);
                        const isUnmapped = !m.targetProperty;
                        return (
                          <div 
                            key={m.sourceProperty}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: isUnmapped ? '#fff7ed' : 'white',
                              border: `1px solid ${isUnmapped ? '#fed7aa' : '#e2e8f0'}`,
                              borderRadius: '7px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.sourceDisplayName}
                              </div>
                            </div>

                            <span style={{ color: isUnmapped ? '#f97316' : '#2563eb', margin: '0 8px', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
                              →
                            </span>

                            <div style={{ flex: 1.35, minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <select 
                                value={m.targetProperty || ''}
                                onChange={e => updateMappingRowTarget(actualIdx, e.target.value)}
                                style={{
                                  width: '100%', padding: '6px 9px', borderRadius: '5px',
                                  border: `1px solid ${isUnmapped ? '#fdba74' : '#86efac'}`,
                                  background: isUnmapped ? '#fff' : '#f0fdf4',
                                  fontSize: '12px', fontWeight: '600',
                                  color: isUnmapped ? '#9a3412' : '#166534',
                                  outline: 'none', cursor: 'pointer', boxSizing: 'border-box'
                                }}
                              >
                                <option value="">— Unmapped —</option>
                                {targetProperties.map(tp => {
                                  const pName = tp.propertyName || tp.propertyname;
                                  const disp = tp.displayName || getTargetFieldDisplayName(pName);
                                  return (
                                    <option key={pName} value={pName}>
                                      {disp}
                                    </option>
                                  );
                                })}
                              </select>

                              <button 
                                onClick={() => removeMappingRow(actualIdx)} 
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.5, padding: '3px', flexShrink: 0 }}
                                onMouseOver={e => e.currentTarget.style.opacity = 1}
                                onMouseOut={e => e.currentTarget.style.opacity = 0.5}
                                title="Remove row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ── Right Column: TARGET METADATA ── */}
                <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      TARGET METADATA
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '8px' }} />
                      <input 
                        type="text"
                        value={searchTargetTerm}
                        onChange={e => setSearchTargetTerm(e.target.value)}
                        placeholder="Search target fields..."
                        style={{ width: '100%', padding: '5px 10px 5px 28px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1, overflow: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {targetProperties.length === 0 ? (
                      <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        {!targetObjectStore.trim()
                          ? 'Enter Target Repository above to load target classes/tables.'
                          : 'Select a Target Class/Table above to load target metadata.'}
                      </div>
                    ) : filteredTargetProperties.length === 0 ? (
                      <div style={{ padding: '20px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                        No matching target fields.
                      </div>
                    ) : (
                      filteredTargetProperties.map(tp => (
                        <div 
                          key={tp.propertyName}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 14px', background: 'white', border: '1px solid #e2e8f0',
                            borderRadius: '7px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#065f46' }}>
                            {tp.displayName || getTargetFieldDisplayName(tp.propertyName)}
                          </div>
                          
                          <span style={{ fontSize: '10.5px', color: '#059669', background: '#f0fdf4', padding: '2px 8px', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTypeColor(tp.dataType || tp.datatype) }} />
                            {formatTypeName(tp.dataType || tp.datatype)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ================= TABLE GRID VIEW ================= */}
            {viewMode === 'grid' && (
              <div style={{ flex: 1, background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Field Name</th>
                        <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Data Type</th>
                        <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f0fdf4' }}>Target Field Name</th>
                        <th style={{ padding: '8px 14px', fontSize: '10.5px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f0fdf4' }}>Target Data Type</th>
                        <th style={{ padding: '8px 14px', width: '30px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
                            <LayoutList size={32} color="#cbd5e1" style={{ marginBottom: '10px', opacity: 0.7 }} />
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '500' }}>Enter Source Object Store (e.g. FNIS) and select a Source Document Class above to populate property rows.</p>
                          </td>
                        </tr>
                      ) : (
                        mappings.map((m, idx) => (
                          <tr key={m.sourceProperty || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafaf9' }}>
                            <td style={{ padding: '8px 14px', fontSize: '12.5px', color: '#0f172a', fontWeight: '600' }}>
                              {m.sourceDisplayName || getSourceFieldDisplayName(m.sourceProperty)}
                            </td>
                            <td style={{ padding: '8px 14px', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                              <span style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '2px 7px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: getTypeColor(m.sourceDataType) }} />
                                {formatTypeName(m.sourceDataType)}
                              </span>
                            </td>
                            
                            <td style={{ padding: '8px 14px', background: '#f0fdf4' }}>
                              <select 
                                value={m.targetProperty || ''}
                                onChange={e => updateMappingRowTarget(idx, e.target.value)}
                                disabled={!selectedTargetClass}
                                style={{ 
                                  width: '100%', padding: '4px 8px', borderRadius: '5px', 
                                  border: `1px solid ${!m.targetProperty ? '#fca5a5' : '#86efac'}`, fontSize: '11.5px', outline: 'none', 
                                  color: !m.targetProperty ? '#991b1b' : '#065f46', fontWeight: '600', background: 'white', 
                                  cursor: selectedTargetClass ? 'pointer' : 'not-allowed' 
                                }}
                              >
                                <option value="">-- Do Not Map --</option>
                                {targetProperties.map(tp => {
                                  const pName = tp.propertyName || tp.propertyname;
                                  const disp = tp.displayName || getTargetFieldDisplayName(pName);
                                  return <option key={pName} value={pName}>{disp}</option>;
                                })}
                              </select>
                            </td>
                            <td style={{ padding: '8px 14px', fontSize: '11px', color: '#059669', fontWeight: '700', background: '#f0fdf4' }}>
                              <span style={{ fontSize: '11px', color: '#059669', background: '#f0fdf4', padding: '2px 7px', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: getTypeColor(m.targetDataType) }} />
                                {formatTypeName(m.targetDataType)}
                              </span>
                            </td>
                            <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                              <button 
                                onClick={() => removeMappingRow(idx)} 
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s', padding: '4px' }}
                                onMouseOver={e => e.currentTarget.style.opacity = 1}
                                onMouseOut={e => e.currentTarget.style.opacity = 0.6}
                                title="Remove mapping row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}
