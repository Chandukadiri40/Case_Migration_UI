import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGetTenantConfig, apiGetSourceTargetConfigs, apiGetDbConfig } from '../utils/api';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [tenantConfig, setTenantConfig] = useState(null);
  const [sourceTargetConfigs, setSourceTargetConfigs] = useState({
    activeSourceId: '',
    activeTargetId: '',
    sourceConfigurations: [],
    targetConfigurations: [],
    storageConfigurations: [],
    executionPathConfigurations: [],
    databaseConfigurations: []
  });
  const [dbConfig, setDbConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tenantData, stData, dbData] = await Promise.all([
        apiGetTenantConfig(true).catch(() => null),
        apiGetSourceTargetConfigs().catch(() => null),
        apiGetDbConfig().catch(() => null)
      ]);

      if (tenantData) setTenantConfig(tenantData);
      if (stData) setSourceTargetConfigs(stData);
      if (dbData) setDbConfig(dbData);
    } catch (err) {
      console.warn("Failed to fetch dynamic configurations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllConfigs();
  }, [fetchAllConfigs]);

  // Resolve Active Source Configuration Profile
  const activeSource = React.useMemo(() => {
    const list = sourceTargetConfigs?.sourceConfigurations || [];
    const activeId = sourceTargetConfigs?.activeSourceId;
    if (activeId) {
      const found = list.find(s => s.id === activeId);
      if (found) return found;
    }
    return list[0] || null;
  }, [sourceTargetConfigs]);

  // Resolve Active Target Configuration Profile
  const activeTarget = React.useMemo(() => {
    const list = sourceTargetConfigs?.targetConfigurations || [];
    const activeId = sourceTargetConfigs?.activeTargetId;
    if (activeId) {
      const found = list.find(t => t.id === activeId);
      if (found) return found;
    }
    return list[0] || null;
  }, [sourceTargetConfigs]);

  // Resolve Active Database Configuration
  const activeDb = React.useMemo(() => {
    if (!dbConfig || !dbConfig.databases) return null;
    const activeType = dbConfig.activeDatabaseType;
    return dbConfig.databases.find(d => d.databaseType === activeType) || dbConfig.databases[0] || null;
  }, [dbConfig]);

  // Resolve Active Execution Path Configuration
  const activeExecPath = React.useMemo(() => {
    const list = sourceTargetConfigs?.executionPathConfigurations || [];
    return list[0] || null;
  }, [sourceTargetConfigs]);

  const value = {
    tenantConfig,
    sourceTargetConfigs,
    dbConfig,
    activeSource,
    activeTarget,
    activeDb,
    activeExecPath,
    applications: tenantConfig?.applications || [],
    isLoading,
    refreshConfig: fetchAllConfigs,
    setSourceTargetConfigs
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export default ConfigContext;
