import { useDroppable } from '@dnd-kit/core';

export function DropZone({ index, label }: { index: number; label: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `dropzone:${index}`,
    data: { source: 'dropzone', index },
  });
  // role="presentation" opts out of the a11y tree; keyboard users use the
  // pantry's Insert buttons and the sprite's arrow-key reorder instead, so
  // a `title` (tooltip) is enough here.
  return (
    <div
      ref={setNodeRef}
      className={`drop-zone${isOver ? ' over' : ''}`}
      title={label}
      role="presentation"
    />
  );
}
