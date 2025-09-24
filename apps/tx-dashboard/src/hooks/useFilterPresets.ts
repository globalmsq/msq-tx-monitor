import { useState, useCallback, useEffect } from 'react';
import { FilterState } from './useUrlFilterSync';

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: FilterState;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'msq-tx-monitor-filter-presets';

// Default presets that are always available
const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'recent-24h',
    name: 'Recent 24h',
    description: 'Transactions from the last 24 hours',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    filters: {
      tokens: ['MSQ', 'SUT', 'KWT', 'P2UC'],
      showAnomalies: false,
      amountRange: { min: '', max: '' },
      timeRange: {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16),
        to: '',
      },
      addressSearch: '',
      riskLevel: 'all',
    },
  },
  {
    id: 'high-volume',
    name: 'High Volume',
    description: 'Large transactions above 10,000 tokens',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    filters: {
      tokens: ['MSQ', 'SUT', 'KWT', 'P2UC'],
      showAnomalies: false,
      amountRange: { min: '10000', max: '' },
      timeRange: { from: '', to: '' },
      addressSearch: '',
      riskLevel: 'all',
    },
  },
  {
    id: 'msq-only',
    name: 'MSQ Only',
    description: 'Show only MSQ token transactions',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    filters: {
      tokens: ['MSQ'],
      showAnomalies: false,
      amountRange: { min: '', max: '' },
      timeRange: { from: '', to: '' },
      addressSearch: '',
      riskLevel: 'all',
    },
  },
];

/**
 * Hook for managing filter presets with localStorage persistence
 */
export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedPresets = stored ? JSON.parse(stored) : [];

      // Merge default presets with stored custom presets
      const customPresets = storedPresets.filter(
        (preset: FilterPreset) => !preset.isDefault
      );
      const allPresets = [...DEFAULT_PRESETS, ...customPresets];

      setPresets(allPresets);
    } catch (error) {
      console.error('Failed to load filter presets:', error);
      setPresets(DEFAULT_PRESETS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save custom presets to localStorage
  const savePresetsToStorage = useCallback((presets: FilterPreset[]) => {
    try {
      const customPresets = presets.filter(preset => !preset.isDefault);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  }, []);

  // Create a new custom preset
  const createPreset = useCallback(
    (name: string, description: string, filters: FilterState) => {
      const newPreset: FilterPreset = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: name.trim(),
        description: description.trim(),
        filters: { ...filters },
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updatedPresets = [...presets, newPreset];
      setPresets(updatedPresets);
      savePresetsToStorage(updatedPresets);

      return newPreset;
    },
    [presets, savePresetsToStorage]
  );

  // Update an existing preset
  const updatePreset = useCallback(
    (
      id: string,
      updates: Partial<Pick<FilterPreset, 'name' | 'description' | 'filters'>>
    ) => {
      const updatedPresets = presets.map(preset => {
        if (preset.id === id && !preset.isDefault) {
          return {
            ...preset,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return preset;
      });

      setPresets(updatedPresets);
      savePresetsToStorage(updatedPresets);
    },
    [presets, savePresetsToStorage]
  );

  // Delete a custom preset
  const deletePreset = useCallback(
    (id: string) => {
      const updatedPresets = presets.filter(
        preset => preset.id !== id || preset.isDefault
      );
      setPresets(updatedPresets);
      savePresetsToStorage(updatedPresets);
    },
    [presets, savePresetsToStorage]
  );

  // Get preset by ID
  const getPreset = useCallback(
    (id: string): FilterPreset | undefined => {
      return presets.find(preset => preset.id === id);
    },
    [presets]
  );

  // Check if preset name already exists
  const isPresetNameTaken = useCallback(
    (name: string, excludeId?: string): boolean => {
      return presets.some(
        preset =>
          preset.name.toLowerCase() === name.toLowerCase() &&
          preset.id !== excludeId
      );
    },
    [presets]
  );

  // Get only custom presets
  const customPresets = presets.filter(preset => !preset.isDefault);

  // Get only default presets
  const defaultPresets = presets.filter(preset => preset.isDefault);

  // Export all presets as JSON
  const exportPresets = useCallback((): string => {
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      presets: customPresets,
    };
    return JSON.stringify(exportData, null, 2);
  }, [customPresets]);

  // Import presets from JSON
  const importPresets = useCallback(
    (
      jsonData: string
    ): { success: boolean; imported: number; errors: string[] } => {
      try {
        const data = JSON.parse(jsonData);
        const errors: string[] = [];
        let imported = 0;

        if (!Array.isArray(data.presets)) {
          return {
            success: false,
            imported: 0,
            errors: ['Invalid preset data format'],
          };
        }

        const newPresets = data.presets
          .filter((preset: FilterPreset) => {
            // Validate preset structure
            if (!preset.name || !preset.filters) {
              errors.push(`Invalid preset: ${preset.name || 'unnamed'}`);
              return false;
            }

            // Check for name conflicts
            if (isPresetNameTaken(preset.name)) {
              errors.push(`Preset name already exists: ${preset.name}`);
              return false;
            }

            return true;
          })
          .map((preset: FilterPreset) => ({
            ...preset,
            id: `imported-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            isDefault: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));

        if (newPresets.length > 0) {
          const updatedPresets = [...presets, ...newPresets];
          setPresets(updatedPresets);
          savePresetsToStorage(updatedPresets);
          imported = newPresets.length;
        }

        return {
          success: errors.length === 0,
          imported,
          errors,
        };
      } catch (error) {
        return {
          success: false,
          imported: 0,
          errors: ['Failed to parse JSON data'],
        };
      }
    },
    [presets, savePresetsToStorage, isPresetNameTaken]
  );

  // Reset to default presets only
  const resetToDefaults = useCallback(() => {
    setPresets(DEFAULT_PRESETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    presets,
    defaultPresets,
    customPresets,
    isLoading,
    createPreset,
    updatePreset,
    deletePreset,
    getPreset,
    isPresetNameTaken,
    exportPresets,
    importPresets,
    resetToDefaults,
  };
}
