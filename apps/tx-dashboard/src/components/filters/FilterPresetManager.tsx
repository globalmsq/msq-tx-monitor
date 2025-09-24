import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  Download,
  Upload,
  Save,
  X,
  Settings,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { FilterState } from '../../hooks/useUrlFilterSync';
import { useFilterPresets, FilterPreset } from '../../hooks/useFilterPresets';
import { getFilterSummary } from '../../utils/filterUtils';

interface FilterPresetManagerProps {
  currentFilters: FilterState;
  onApplyPreset: (filters: FilterState) => void;
  className?: string;
}

interface CreatePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  currentFilters: FilterState;
}

function CreatePresetModal({
  isOpen,
  onClose,
  onSave,
  currentFilters,
}: CreatePresetModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { isPresetNameTaken } = useFilterPresets();

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim() && !isPresetNameTaken(name.trim())) {
      onSave(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    }
  };

  const filterSummary = getFilterSummary(currentFilters);

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='glass rounded-xl w-full max-w-md'>
        <div className='flex items-center justify-between p-4 border-b border-white/10'>
          <div className='flex items-center space-x-2'>
            <Save className='w-5 h-5 text-primary-400' />
            <h3 className='text-lg font-semibold text-white'>
              Save Filter Preset
            </h3>
          </div>
          <button
            onClick={onClose}
            className='p-1 text-white/70 hover:text-white transition-colors rounded hover:bg-white/10'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-4 space-y-4'>
          {/* Current filters preview */}
          <div className='glass-dark rounded-lg p-3'>
            <p className='text-sm text-white/70 mb-2'>Current Filters:</p>
            {filterSummary.length > 0 ? (
              <div className='flex flex-wrap gap-1'>
                {filterSummary.map((summary, index) => (
                  <span
                    key={index}
                    className='px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs'
                  >
                    {summary}
                  </span>
                ))}
              </div>
            ) : (
              <p className='text-white/50 text-sm'>No active filters</p>
            )}
          </div>

          {/* Name input */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-white/70'>
              Preset Name *
            </label>
            <input
              type='text'
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='Enter preset name...'
              className={cn(
                'w-full px-3 py-2 glass-dark rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2',
                isPresetNameTaken(name.trim())
                  ? 'focus:ring-red-500/50 border border-red-500/50'
                  : 'focus:ring-primary-500/50'
              )}
            />
            {isPresetNameTaken(name.trim()) && (
              <p className='text-red-400 text-xs'>
                This preset name already exists
              </p>
            )}
          </div>

          {/* Description input */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-white/70'>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder='Optional description...'
              rows={3}
              className='w-full px-3 py-2 glass-dark rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none'
            />
          </div>
        </div>

        <div className='flex items-center justify-end space-x-3 p-4 border-t border-white/10'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-white/70 hover:text-white transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isPresetNameTaken(name.trim())}
            className={cn(
              'px-4 py-2 rounded-lg text-white transition-colors',
              !name.trim() || isPresetNameTaken(name.trim())
                ? 'bg-white/20 cursor-not-allowed'
                : 'bg-gradient-primary hover:opacity-90'
            )}
          >
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
}

export function FilterPresetManager({
  currentFilters,
  onApplyPreset,
  className,
}: FilterPresetManagerProps) {
  const {
    defaultPresets,
    customPresets,
    isLoading,
    createPreset,
    deletePreset,
    exportPresets,
    importPresets,
  } = useFilterPresets();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    defaults: true,
    custom: true,
  });

  const handleSavePreset = (name: string, description: string) => {
    createPreset(name, description, currentFilters);
  };

  const handleDeletePreset = (preset: FilterPreset) => {
    if (window.confirm(`Are you sure you want to delete "${preset.name}"?`)) {
      deletePreset(preset.id);
    }
  };

  const handleExportPresets = () => {
    const data = exportPresets();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `msq-filter-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportPresets = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          const data = e.target?.result as string;
          const result = importPresets(data);
          if (result.success) {
            alert(`Successfully imported ${result.imported} presets`);
          } else {
            alert(`Import failed: ${result.errors.join(', ')}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const toggleSection = (section: 'defaults' | 'custom') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className='flex items-center justify-between'>
          <div className='h-4 bg-white/20 rounded w-24 animate-pulse' />
          <div className='h-8 w-8 bg-white/20 rounded animate-pulse' />
        </div>
        <div className='space-y-2'>
          {[1, 2, 3].map(i => (
            <div key={i} className='h-12 bg-white/10 rounded animate-pulse' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with actions */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          <Bookmark className='w-4 h-4 text-white/70' />
          <h3 className='text-sm font-medium text-white/70'>Presets</h3>
        </div>
        <div className='flex items-center space-x-1'>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className='p-1.5 text-white/70 hover:text-white transition-colors rounded hover:bg-white/10'
            title='Save Current Filters'
          >
            <Plus className='w-4 h-4' />
          </button>
          <button
            onClick={handleExportPresets}
            disabled={customPresets.length === 0}
            className={cn(
              'p-1.5 transition-colors rounded',
              customPresets.length > 0
                ? 'text-white/70 hover:text-white hover:bg-white/10'
                : 'text-white/30 cursor-not-allowed'
            )}
            title='Export Custom Presets'
          >
            <Download className='w-4 h-4' />
          </button>
          <button
            onClick={handleImportPresets}
            className='p-1.5 text-white/70 hover:text-white transition-colors rounded hover:bg-white/10'
            title='Import Presets'
          >
            <Upload className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Default Presets */}
      {defaultPresets.length > 0 && (
        <div className='space-y-2'>
          <button
            onClick={() => toggleSection('defaults')}
            className='flex items-center space-x-2 text-xs font-medium text-white/60 uppercase tracking-wider hover:text-white/80 transition-colors'
          >
            <span>Quick Filters</span>
            <div
              className={cn(
                'transition-transform',
                expandedSections.defaults ? 'rotate-90' : ''
              )}
            >
              ▶
            </div>
          </button>

          {expandedSections.defaults && (
            <div className='space-y-1'>
              {defaultPresets.map(preset => {
                const summary = getFilterSummary(preset.filters);
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset.filters)}
                    className='w-full flex items-center justify-between p-2 glass-dark rounded-lg hover:bg-white/10 transition-colors text-left group'
                  >
                    <div className='flex-1 min-w-0'>
                      <p className='text-white text-sm font-medium truncate'>
                        {preset.name}
                      </p>
                      {summary.length > 0 && (
                        <div className='flex flex-wrap gap-1 mt-1'>
                          {summary.slice(0, 2).map((s, i) => (
                            <span
                              key={i}
                              className='text-xs text-white/50 bg-white/10 px-1 rounded'
                            >
                              {s}
                            </span>
                          ))}
                          {summary.length > 2 && (
                            <span className='text-xs text-white/50'>
                              +{summary.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Settings className='w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0 ml-2' />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Presets */}
      {customPresets.length > 0 && (
        <div className='space-y-2'>
          <button
            onClick={() => toggleSection('custom')}
            className='flex items-center space-x-2 text-xs font-medium text-white/60 uppercase tracking-wider hover:text-white/80 transition-colors'
          >
            <span>Saved Presets ({customPresets.length})</span>
            <div
              className={cn(
                'transition-transform',
                expandedSections.custom ? 'rotate-90' : ''
              )}
            >
              ▶
            </div>
          </button>

          {expandedSections.custom && (
            <div className='space-y-1'>
              {customPresets.map(preset => {
                const summary = getFilterSummary(preset.filters);
                return (
                  <div
                    key={preset.id}
                    className='flex items-center space-x-2 p-2 glass-dark rounded-lg group'
                  >
                    <button
                      onClick={() => onApplyPreset(preset.filters)}
                      className='flex-1 min-w-0 text-left hover:bg-white/5 rounded p-1 -m-1 transition-colors'
                    >
                      <p className='text-white text-sm font-medium truncate'>
                        {preset.name}
                      </p>
                      {preset.description && (
                        <p className='text-white/50 text-xs truncate'>
                          {preset.description}
                        </p>
                      )}
                      {summary.length > 0 && (
                        <div className='flex flex-wrap gap-1 mt-1'>
                          {summary.slice(0, 2).map((s, i) => (
                            <span
                              key={i}
                              className='text-xs text-white/50 bg-white/10 px-1 rounded'
                            >
                              {s}
                            </span>
                          ))}
                          {summary.length > 2 && (
                            <span className='text-xs text-white/50'>
                              +{summary.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                    <div className='flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button
                        onClick={() => handleDeletePreset(preset)}
                        className='p-1 text-white/50 hover:text-red-400 transition-colors rounded hover:bg-white/10'
                        title='Delete Preset'
                      >
                        <Trash2 className='w-3 h-3' />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state for custom presets */}
      {customPresets.length === 0 && (
        <div className='text-center py-4'>
          <Bookmark className='w-8 h-8 text-white/20 mx-auto mb-2' />
          <p className='text-white/50 text-sm'>No saved presets</p>
          <p className='text-white/40 text-xs'>
            Click + to save current filters
          </p>
        </div>
      )}

      {/* Create Preset Modal */}
      <CreatePresetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSavePreset}
        currentFilters={currentFilters}
      />
    </div>
  );
}
