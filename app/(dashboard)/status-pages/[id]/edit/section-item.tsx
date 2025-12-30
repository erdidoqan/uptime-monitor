'use client';

import { useState } from 'react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GripVertical, MoreHorizontal, Globe, Timer, ChevronDown, ChevronRight } from 'lucide-react';
import type { StatusPageSection, StatusPageResource } from '@/shared/types';
import { ResourceSearch } from './resource-search';

interface SectionItemProps {
  section: StatusPageSection & { resources: StatusPageResource[] };
  onUpdate: (
    sectionId: string,
    data: { name?: string | null; resources?: { resource_type: 'monitor' | 'cron_job'; resource_id: string; show_history?: number }[] }
  ) => Promise<void>;
  onDelete: (sectionId: string) => Promise<void>;
}

// Sortable Resource Item Component
function SortableResourceItem({
  resource,
  onRemove,
  disabled,
}: {
  resource: StatusPageResource;
  onRemove: () => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${resource.resource_type}-${resource.resource_id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getResourceDisplayName = () => {
    if (resource.resource_name) return resource.resource_name;
    if (resource.resource_url) {
      try {
        const url = new URL(resource.resource_url);
        return url.hostname;
      } catch {
        return resource.resource_url;
      }
    }
    return resource.resource_id;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {resource.resource_type === 'monitor' ? (
          <Globe className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Timer className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {getResourceDisplayName()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          With status history
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          disabled={disabled}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SectionItem({ section, onUpdate, onDelete }: SectionItemProps) {
  const [name, setName] = useState(section.name || '');
  const [resources, setResources] = useState(section.resources || []);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sensors for section drag
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sensors for resource drag
  const resourceSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleNameBlur = async () => {
    if (name !== (section.name || '')) {
      setSaving(true);
      try {
        await onUpdate(section.id, { name: name || null });
      } catch (err) {
        setName(section.name || '');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddResource = async (resource: { resource_type: 'monitor' | 'cron_job'; resource_id: string; resource_name?: string; resource_url?: string }) => {
    // Check if resource already exists
    if (resources.some(r => r.resource_id === resource.resource_id && r.resource_type === resource.resource_type)) {
      return;
    }

    const newResources = [
      ...resources.map(r => ({
        resource_type: r.resource_type,
        resource_id: r.resource_id,
        show_history: r.show_history,
      })),
      {
        resource_type: resource.resource_type,
        resource_id: resource.resource_id,
        show_history: 1,
      },
    ];

    setSaving(true);
    try {
      await onUpdate(section.id, { resources: newResources });
      setResources(prev => [...prev, {
        id: '', // Will be set by server
        section_id: section.id,
        resource_type: resource.resource_type,
        resource_id: resource.resource_id,
        resource_name: resource.resource_name,
        resource_url: resource.resource_url,
        show_history: 1,
        sort_order: prev.length,
      }]);
    } catch (err) {
      console.error('Failed to add resource:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveResource = async (resourceId: string, resourceType: string) => {
    const newResources = resources
      .filter(r => !(r.resource_id === resourceId && r.resource_type === resourceType))
      .map(r => ({
        resource_type: r.resource_type,
        resource_id: r.resource_id,
        show_history: r.show_history,
      }));

    setSaving(true);
    try {
      await onUpdate(section.id, { resources: newResources });
      setResources(prev => prev.filter(r => !(r.resource_id === resourceId && r.resource_type === resourceType)));
    } catch (err) {
      console.error('Failed to remove resource:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResourceDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = resources.findIndex(
        (r) => `${r.resource_type}-${r.resource_id}` === active.id
      );
      const newIndex = resources.findIndex(
        (r) => `${r.resource_type}-${r.resource_id}` === over.id
      );

      const newResources = arrayMove(resources, oldIndex, newIndex);
      setResources(newResources);

      // Update order on server
      setSaving(true);
      try {
        await onUpdate(section.id, {
          resources: newResources.map(r => ({
            resource_type: r.resource_type,
            resource_id: r.resource_id,
            show_history: r.show_history,
          })),
        });
      } catch (err) {
        console.error('Failed to reorder resources:', err);
        // Revert on error
        setResources(section.resources || []);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(section.id);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to delete section:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card ref={setNodeRef} style={style} className="border">
        <CardContent className="p-0">
          {/* Collapsed header - always visible */}
          <div className="flex items-center gap-2 p-4">
            {/* Drag handle for section */}
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>

            {/* Clickable area for expand/collapse */}
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-muted/50 -my-2 py-2 px-1 rounded transition-colors"
            >
              {/* Expand/collapse icon */}
              <div className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>

              {/* Section title preview */}
              <span className="text-sm font-medium truncate">
                {name || 'Untitled section'}
              </span>
              <span className="text-xs text-muted-foreground">
                ({resources.length} resource{resources.length !== 1 ? 's' : ''})
              </span>
            </div>

            {/* Section actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Expandable content */}
          {isExpanded && (
            <div className="px-4 pb-4 pt-0 pl-12 space-y-4">
              {/* Section name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Section name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder="Leave blank to hide the section heading."
                  className="max-w-md"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to hide the section heading.
                </p>
              </div>

              {/* Resources */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Resources</Label>
                
                {/* Resource search */}
                <ResourceSearch 
                  onSelect={handleAddResource} 
                  disabled={saving}
                  excludedResources={resources.map(r => ({ 
                    resource_type: r.resource_type, 
                    resource_id: r.resource_id 
                  }))}
                />

                {/* Resource list with drag and drop */}
                {resources.length > 0 && (
                  <DndContext
                    sensors={resourceSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleResourceDragEnd}
                  >
                    <SortableContext
                      items={resources.map((r) => `${r.resource_type}-${r.resource_id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 mt-3">
                        {resources.map((resource) => (
                          <SortableResourceItem
                            key={`${resource.resource_type}-${resource.resource_id}`}
                            resource={resource}
                            onRemove={() => handleRemoveResource(resource.resource_id, resource.resource_type)}
                            disabled={saving}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? All resources in this section will be removed from the status page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
