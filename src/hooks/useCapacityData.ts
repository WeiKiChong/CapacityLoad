import { useState, useEffect, useCallback } from 'react';
import { StandardTime, Resource, Demand, Notification } from '../types';

export function useCapacityData() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'standard' | 'resource' | 'demand' | 'settings'>('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Data States
  const [standardTimes, setStandardTimes] = useState<StandardTime[]>(() => {
    const saved = localStorage.getItem('standardTimes');
    return saved ? JSON.parse(saved) : [];
  });
  const [resources, setResources] = useState<Resource[]>(() => {
    const saved = localStorage.getItem('resources');
    return saved ? JSON.parse(saved) : [];
  });
  const [demands, setDemands] = useState<Demand[]>(() => {
    const saved = localStorage.getItem('demands');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('standardTimes', JSON.stringify(standardTimes));
  }, [standardTimes]);

  useEffect(() => {
    localStorage.setItem('resources', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('demands', JSON.stringify(demands));
  }, [demands]);

  const addNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setNotifications(prev => [{ id, type, message }, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const isFieldModified = useCallback((item: any, field: string) => {
    if (!item.original) return false;
    return item[field] !== item.original[field];
  }, []);

  const isRowModified = useCallback((item: any) => {
    if (!item.original) return false;
    return Object.keys(item.original).some(key => item[key] !== item.original[key]);
  }, []);

  const restoreRow = useCallback((idx: number, type: 'standard' | 'resource' | 'demand') => {
    if (type === 'standard') {
      const newItems = [...standardTimes];
      if (newItems[idx].original) {
        newItems[idx] = { ...newItems[idx], ...newItems[idx].original };
      }
      setStandardTimes(newItems);
    } else if (type === 'resource') {
      const newItems = [...resources];
      if (newItems[idx].original) {
        newItems[idx] = { ...newItems[idx], ...newItems[idx].original };
      }
      setResources(newItems);
    } else if (type === 'demand') {
      const newItems = [...demands];
      if (newItems[idx].original) {
        newItems[idx] = { ...newItems[idx], ...newItems[idx].original };
      }
      setDemands(newItems);
    }
  }, [standardTimes, resources, demands]);

  return {
    activeTab,
    setActiveTab,
    notifications,
    addNotification,
    isConfirmingClear,
    setIsConfirmingClear,
    standardTimes,
    setStandardTimes,
    resources,
    setResources,
    demands,
    setDemands,
    isFieldModified,
    isRowModified,
    restoreRow
  };
}
