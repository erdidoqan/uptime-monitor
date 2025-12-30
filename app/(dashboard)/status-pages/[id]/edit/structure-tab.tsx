'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatusPageSection, StatusPageResource } from '@/shared/types';
import { SectionItem } from './section-item';

interface StructureTabProps {
  statusPageId: string;
}

export function StructureTab({ statusPageId }: StructureTabProps) {
  const [sections, setSections] = useState<(StatusPageSection & { resources: StatusPageResource[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchSections = useCallback(async () => {
    try {
      const data = await api.get<(StatusPageSection & { resources: StatusPageResource[] })[]>(
        `/status-pages/${statusPageId}/sections`
      );
      setSections(data);
    } catch (err: any) {
      console.error('Failed to fetch sections:', err);
      setError(err.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, [statusPageId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      setSections(newSections);

      // Update order on server
      try {
        await api.put(`/status-pages/${statusPageId}/sections/reorder`, {
          section_ids: newSections.map((s) => s.id),
        });
      } catch (err) {
        console.error('Failed to reorder sections:', err);
        // Revert on error
        fetchSections();
      }
    }
  };

  const handleAddSection = async () => {
    setAddingSection(true);
    try {
      const newSection = await api.post<StatusPageSection & { resources: StatusPageResource[] }>(
        `/status-pages/${statusPageId}/sections`,
        { name: '', resources: [] }
      );
      setSections((prev) => [...prev, newSection]);
    } catch (err: any) {
      console.error('Failed to add section:', err);
      setError(err.message || 'Failed to add section');
    } finally {
      setAddingSection(false);
    }
  };

  const handleUpdateSection = async (
    sectionId: string,
    data: { name?: string | null; resources?: { resource_type: 'monitor' | 'cron_job'; resource_id: string; show_history?: number }[] }
  ) => {
    try {
      const updatedSection = await api.put<StatusPageSection & { resources: StatusPageResource[] }>(
        `/status-pages/${statusPageId}/sections/${sectionId}`,
        data
      );
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? updatedSection : s))
      );
    } catch (err: any) {
      console.error('Failed to update section:', err);
      throw err;
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await api.delete(`/status-pages/${statusPageId}/sections/${sectionId}`);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } catch (err: any) {
      console.error('Failed to delete section:', err);
      setError(err.message || 'Failed to delete section');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side - Description */}
      <div className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-2">Monitors & Cron Jobs</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Pick the monitors and cron jobs you want to display on your status page.
        </p>
        <p className="text-sm text-muted-foreground">
          You can re-order the monitors by dragging the cards, as well as give each monitor a public name and a short explanation of the service it's monitoring.
        </p>
      </div>

      {/* Right side - Sections */}
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {sections.length === 0 ? (
          <Card className="border">
            <CardContent className="pt-8 text-center py-16">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">No sections yet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Add sections to organize your monitors and cron jobs on the status page.
              </p>
              <Button size="sm" onClick={handleAddSection} disabled={addingSection}>
                <Plus className="mr-2 h-4 w-4" />
                {addingSection ? 'Adding...' : 'Add Section'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {sections.map((section) => (
                    <SectionItem
                      key={section.id}
                      section={section}
                      onUpdate={handleUpdateSection}
                      onDelete={handleDeleteSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddSection}
              disabled={addingSection}
            >
              <Plus className="mr-2 h-4 w-4" />
              {addingSection ? 'Adding...' : 'Add Section'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

