import React, { useState } from 'react';
import { Settings, Eye, EyeOff, RotateCcw, Save, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ChartConfig {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  tab: string;
}

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  chartConfigs: ChartConfig[];
  onConfigChange: (configs: ChartConfig[]) => void;
  onReset: () => void;
}

export function DashboardCustomizer({
  isOpen,
  onClose,
  chartConfigs,
  onConfigChange,
  onReset,
}: DashboardCustomizerProps) {
  const [tempConfigs, setTempConfigs] = useState<ChartConfig[]>(chartConfigs);

  const handleToggleVisibility = (id: string) => {
    setTempConfigs(prev =>
      prev.map(config =>
        config.id === id ? { ...config, visible: !config.visible } : config
      )
    );
  };

  const handleSave = () => {
    onConfigChange(tempConfigs);
    onClose();
  };

  const handleReset = () => {
    onReset();
    setTempConfigs(chartConfigs);
  };

  const handleCancel = () => {
    setTempConfigs(chartConfigs);
    onClose();
  };

  const groupedConfigs = tempConfigs.reduce(
    (acc, config) => {
      if (!acc[config.tab]) {
        acc[config.tab] = [];
      }
      acc[config.tab].push(config);
      return acc;
    },
    {} as Record<string, ChartConfig[]>
  );

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-white/10'>
          <div>
            <h2 className='text-xl font-bold text-white flex items-center gap-2'>
              <Settings className='w-5 h-5' />
              Dashboard Customization
            </h2>
            <p className='text-white/60 mt-1'>
              Choose which charts to display in your analytics dashboard
            </p>
          </div>
          <button
            onClick={handleCancel}
            className='p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 overflow-y-auto max-h-[calc(80vh-160px)]'>
          <div className='space-y-6'>
            {Object.entries(groupedConfigs).map(([tab, configs]) => (
              <div key={tab} className='space-y-3'>
                <h3 className='text-white font-medium text-lg capitalize'>
                  {tab} Tab
                </h3>
                <div className='space-y-2'>
                  {configs.map(config => (
                    <div
                      key={config.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border transition-colors',
                        config.visible
                          ? 'bg-white/5 border-white/20'
                          : 'bg-white/2 border-white/10'
                      )}
                    >
                      <div className='flex-1'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full transition-colors',
                              config.visible ? 'bg-green-400' : 'bg-gray-500'
                            )}
                          />
                          <div>
                            <h4
                              className={cn(
                                'font-medium transition-colors',
                                config.visible ? 'text-white' : 'text-white/60'
                              )}
                            >
                              {config.name}
                            </h4>
                            <p className='text-white/50 text-sm'>
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleVisibility(config.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                          config.visible
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                        )}
                      >
                        {config.visible ? (
                          <>
                            <Eye className='w-4 h-4' />
                            <span className='text-sm'>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className='w-4 h-4' />
                            <span className='text-sm'>Hidden</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className='mt-6 p-4 bg-white/5 rounded-lg'>
            <h4 className='text-white font-medium mb-2'>Summary</h4>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-white/60'>Visible charts:</span>
                <span className='text-green-400 font-medium ml-2'>
                  {tempConfigs.filter(c => c.visible).length}
                </span>
              </div>
              <div>
                <span className='text-white/60'>Hidden charts:</span>
                <span className='text-gray-400 font-medium ml-2'>
                  {tempConfigs.filter(c => !c.visible).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between p-6 border-t border-white/10'>
          <button
            onClick={handleReset}
            className='flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors'
          >
            <RotateCcw className='w-4 h-4' />
            Reset to Default
          </button>

          <div className='flex gap-3'>
            <button
              onClick={handleCancel}
              className='px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className='flex items-center gap-2 px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors'
            >
              <Save className='w-4 h-4' />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
