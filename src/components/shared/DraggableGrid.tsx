"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: Record<string, unknown>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

interface DraggableGridProps {
  items: string[];
  onReorder: (newOrder: string[]) => void;
  children: (id: string, dragHandleProps: Record<string, unknown>) => React.ReactNode;
}

export function DraggableGrid({ items, onReorder, children }: DraggableGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  }, [items, onReorder]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((id) => (
            <SortableItem key={id} id={id}>
              {(dragHandleProps) => children(id, dragHandleProps)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function DragHandle(props: Record<string, unknown>) {
  return (
    <button
      {...props}
      className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 rounded-md bg-background/80 border hover:bg-accent flex items-center justify-center cursor-grab active:cursor-grabbing"
      title="Drag to reorder"
    >
      <GripVertical className="h-3 w-3 text-muted-foreground" />
    </button>
  );
}
