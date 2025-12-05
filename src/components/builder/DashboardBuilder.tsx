'use client';

import React, { useState, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import {
  Plus,
  Save,
  Eye,
  Settings,
  Undo,
  Redo,
  Trash2,
  Copy,
  GripVertical,
  X,
  Maximize2,
} from 'lucide-react';
import WidgetLibrary from './WidgetLibrary';
import WidgetConfigModal from './WidgetConfigModal';
import WidgetRenderer from './WidgetRenderer';
import 'react-grid-layout/css/styles.css';

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  dataSource?: string;
  metric?: string;
  filters?: Record<string, unknown>;
  aggregation?: string;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  displayOptions?: Record<string, unknown>;
  showTarget?: boolean;
  targetValue?: number;
}

export interface DashboardState {
  id: string;
  name: string;
  layout: Layout[];
  widgets: Record<string, WidgetConfig>;
}

interface DashboardBuilderProps {
  initialDashboard?: DashboardState;
  onSave?: (dashboard: DashboardState) => Promise<void>;
  tenantId?: string;
}

const DEFAULT_DASHBOARD: DashboardState = {
  id: 'new',
  name: 'My Dashboard',
  layout: [],
  widgets: {},
};

export default function DashboardBuilder({
  initialDashboard = DEFAULT_DASHBOARD,
  onSave,
}: DashboardBuilderProps) {
  const [dashboard, setDashboard] = useState<DashboardState>(initialDashboard);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<DashboardState[]>([initialDashboard]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Grid configuration
  const COLS = 12;
  const ROW_HEIGHT = 80;
  const CONTAINER_PADDING: [number, number] = [16, 16];
  const MARGIN: [number, number] = [16, 16];

  // Save to history for undo/redo
  const saveToHistory = useCallback((newState: DashboardState) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Handle layout changes from react-grid-layout
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setDashboard((prev) => {
      const updated = { ...prev, layout: newLayout };
      return updated;
    });
  }, []);

  // Add a new widget from the library
  const handleAddWidget = useCallback((widgetType: string, defaultConfig: Partial<WidgetConfig>) => {
    const widgetId = `widget-${Date.now()}`;
    const newWidget: WidgetConfig = {
      id: widgetId,
      type: widgetType,
      title: defaultConfig.title || 'New Widget',
      ...defaultConfig,
    };

    // Find a good position for the new widget
    const existingLayouts = dashboard.layout;
    let y = 0;
    if (existingLayouts.length > 0) {
      y = Math.max(...existingLayouts.map((l) => l.y + l.h));
    }

    const newLayoutItem: Layout = {
      i: widgetId,
      x: 0,
      y,
      w: (defaultConfig.displayOptions?.width as number) || 3,
      h: (defaultConfig.displayOptions?.height as number) || 2,
      minW: 2,
      minH: 2,
    };

    const newState = {
      ...dashboard,
      layout: [...dashboard.layout, newLayoutItem],
      widgets: { ...dashboard.widgets, [widgetId]: newWidget },
    };

    setDashboard(newState);
    saveToHistory(newState);
    setIsLibraryOpen(false);
    setEditingWidget(widgetId);
  }, [dashboard, saveToHistory]);

  // Update widget configuration
  const handleUpdateWidget = useCallback((widgetId: string, config: Partial<WidgetConfig>) => {
    const newState = {
      ...dashboard,
      widgets: {
        ...dashboard.widgets,
        [widgetId]: { ...dashboard.widgets[widgetId], ...config },
      },
    };
    setDashboard(newState);
    saveToHistory(newState);
  }, [dashboard, saveToHistory]);

  // Delete a widget
  const handleDeleteWidget = useCallback((widgetId: string) => {
    const { [widgetId]: _removed, ...remainingWidgets } = dashboard.widgets;
    void _removed; // Suppress unused variable warning
    const newState = {
      ...dashboard,
      layout: dashboard.layout.filter((l) => l.i !== widgetId),
      widgets: remainingWidgets,
    };
    setDashboard(newState);
    saveToHistory(newState);
    setEditingWidget(null);
  }, [dashboard, saveToHistory]);

  // Duplicate a widget
  const handleDuplicateWidget = useCallback((widgetId: string) => {
    const originalWidget = dashboard.widgets[widgetId];
    const originalLayout = dashboard.layout.find((l) => l.i === widgetId);

    if (!originalWidget || !originalLayout) return;

    const newWidgetId = `widget-${Date.now()}`;
    const newWidget: WidgetConfig = {
      ...originalWidget,
      id: newWidgetId,
      title: `${originalWidget.title} (Copy)`,
    };

    const newLayoutItem: Layout = {
      ...originalLayout,
      i: newWidgetId,
      y: originalLayout.y + originalLayout.h,
    };

    const newState = {
      ...dashboard,
      layout: [...dashboard.layout, newLayoutItem],
      widgets: { ...dashboard.widgets, [newWidgetId]: newWidget },
    };

    setDashboard(newState);
    saveToHistory(newState);
  }, [dashboard, saveToHistory]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setDashboard(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setDashboard(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Save dashboard
  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(dashboard);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left - Dashboard Name */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={dashboard.name}
              onChange={(e) =>
                setDashboard((prev) => ({ ...prev, name: e.target.value }))
              }
              className="bg-transparent text-xl font-bold text-white border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            />
          </div>

          {/* Center - Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-slate-700 mx-2" />

            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Widget
            </button>
          </div>

          {/* Right - View & Save */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isPreviewMode
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Eye className="w-5 h-5" />
              {isPreviewMode ? 'Editing' : 'Preview'}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {dashboard.layout.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6">
              <Plus className="w-12 h-12 text-slate-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Start Building Your Dashboard
            </h2>
            <p className="text-slate-400 mb-8 max-w-md">
              Add widgets to visualize your ServiceTitan data. Drag and drop to
              arrange them exactly how you want.
            </p>
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Widget
            </button>
          </div>
        ) : (
          // Grid Layout
          <GridLayout
            className="layout"
            layout={dashboard.layout}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            width={1200}
            containerPadding={CONTAINER_PADDING}
            margin={MARGIN}
            onLayoutChange={handleLayoutChange}
            isDraggable={!isPreviewMode}
            isResizable={!isPreviewMode}
            draggableHandle=".widget-drag-handle"
          >
            {dashboard.layout.map((layoutItem) => {
              const widget = dashboard.widgets[layoutItem.i];
              if (!widget) return null;

              return (
                <div
                  key={layoutItem.i}
                  className={`
                    group relative bg-slate-800 rounded-xl border overflow-hidden
                    ${isPreviewMode
                      ? 'border-slate-700'
                      : 'border-slate-600 hover:border-blue-500/50'
                    }
                  `}
                >
                  {/* Widget Header (Edit Mode) */}
                  {!isPreviewMode && (
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2">
                        <div className="widget-drag-handle cursor-move p-1 hover:bg-slate-700 rounded">
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-300 truncate max-w-[150px]">
                          {widget.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingWidget(widget.id)}
                          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          title="Configure"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateWidget(widget.id)}
                          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWidget(widget.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Widget Content */}
                  <div className={`h-full ${!isPreviewMode ? 'pt-10' : ''}`}>
                    <WidgetRenderer widget={widget} isPreview={isPreviewMode} />
                  </div>

                  {/* Resize Handle Indicator */}
                  {!isPreviewMode && (
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-4 h-4 text-slate-500 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>

      {/* Widget Library Sidebar */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsLibraryOpen(false)}
          />

          {/* Sidebar */}
          <div className="relative ml-auto w-96 bg-slate-800 border-l border-slate-700 h-full overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Widget Library</h2>
              <button
                onClick={() => setIsLibraryOpen(false)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <WidgetLibrary onAddWidget={handleAddWidget} />
          </div>
        </div>
      )}

      {/* Widget Configuration Modal */}
      {editingWidget && dashboard.widgets[editingWidget] && (
        <WidgetConfigModal
          widget={dashboard.widgets[editingWidget]}
          onUpdate={(config) => handleUpdateWidget(editingWidget, config)}
          onClose={() => setEditingWidget(null)}
          onDelete={() => handleDeleteWidget(editingWidget)}
        />
      )}
    </div>
  );
}
