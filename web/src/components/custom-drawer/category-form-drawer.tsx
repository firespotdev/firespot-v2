'use client'

import { useState } from 'react'
import { GripVertical, Trash2, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Button,
  Input,
  Label,
  Spinner,
  showNotificationToast,
} from '@/components/ui'
import {
  useCreateCategories,
  useUpdateCategory,
} from '@/services/products/hooks'
import type { ProductCategory } from '@/services/products/productsApi'

interface CategoryFormDrawerProps {
  mode: 'create' | 'edit'
  category?: ProductCategory
  onSaved?: () => void
  closeDrawer: () => void
}

interface CategoryNameRow {
  id: string
  name: string
}

const makeRowId = () =>
  typeof crypto !== 'undefined'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

function SortableCategoryRow({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: CategoryNameRow
  index: number
  onChange: (id: string, value: string) => void
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        aria-label={`Drag to reorder category ${index + 1}`}
        className="shrink-0 w-9 h-9 flex justify-center items-center touch-none cursor-grab text-[#111827] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <Input
        autoFocus={index === 0}
        value={row.name}
        onChange={(event) => onChange(row.id, event.target.value)}
        placeholder={index ? 'Add another category' : 'Add a category'}
        className="h-9 rounded-[8px] text-[14px]"
      />
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        aria-label="Remove category"
        className="h-9 w-9 shrink-0 flex justify-center items-center"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export function CategoryFormDrawer({
  mode,
  category,
  onSaved,
  closeDrawer,
}: CategoryFormDrawerProps) {
  const [names, setNames] = useState<CategoryNameRow[]>([
    { id: makeRowId(), name: category?.name || '' },
  ])
  const createCategories = useCreateCategories()
  const updateCategory = useUpdateCategory()
  const editing = mode === 'edit'
  const pending = createCategories.isPending || updateCategory.isPending
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const updateName = (id: string, value: string) => {
    setNames((current) => {
      const index = current.findIndex((item) => item.id === id)
      const next = current.map((item) =>
        item.id === id ? { ...item, name: value } : item,
      )
      return !editing && index === current.length - 1 && value.trim()
        ? [...next, { id: makeRowId(), name: '' }]
        : next
    })
  }

  const removeName = (id: string) => {
    setNames((current) => {
      const next = current.filter((item) => item.id !== id)
      if (!next.length) return [{ id: makeRowId(), name: '' }]
      return next.at(-1)?.name.trim()
        ? [...next, { id: makeRowId(), name: '' }]
        : next
    })
  }

  const reorderNames = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setNames((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id)
      const newIndex = current.findIndex((item) => item.id === over.id)
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  const save = async () => {
    const cleanNames = names.map((row) => row.name.trim()).filter(Boolean)
    if (!cleanNames.length) {
      showNotificationToast({ message: 'Enter a category name.' })
      return
    }
    try {
      if (editing && category) {
        await updateCategory.mutateAsync({
          id: category._id,
          name: cleanNames[0],
        })
        showNotificationToast({ message: 'Category updated', mode: 'success' })
      } else {
        await createCategories.mutateAsync(cleanNames)
        showNotificationToast({ message: 'Category created', mode: 'success' })
      }
      onSaved?.()
      closeDrawer()
    } catch {
      showNotificationToast({
        message: editing
          ? 'Could not update category. Try a different name.'
          : 'Could not create category. Try a different name.',
      })
    }
  }

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between border-b border-[#F1F1F1] px-4 py-2">
        <span className="w-8" aria-hidden="true" />
        <h2 className="text-[16px] font-bold">
          {editing ? 'Edit category' : 'Add a category'}
        </h2>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="p-1.5"
        >
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 p-4">
        {!editing && (
          <p className="mb-4 text-[14px] font-medium text-[#111827] leading-[140%]">
            Group your products or services into categories for faster and
            easier navigation at checkout.
          </p>
        )}
        <Label>Category</Label>
        {editing ? (
          <Input
            autoFocus
            value={names[0]?.name || ''}
            onChange={(event) =>
              updateName(names[0]?.id || '', event.target.value)
            }
            className="h-11 rounded-[8px] text-[16px]"
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={reorderNames}
          >
            <SortableContext
              items={names.map((row) => row.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {names.map((row, index) => (
                  <SortableCategoryRow
                    key={row.id}
                    row={row}
                    index={index}
                    onChange={updateName}
                    onRemove={removeName}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <footer className="flex justify-end gap-4 border-t border-[#F1F1F1] px-4 py-3">
        <Button
          variant="ghost"
          onClick={closeDrawer}
          className="h-10 w-auto px-4"
        >
          Cancel
        </Button>
        <Button onClick={save} disabled={pending} className="h-10 w-auto px-4">
          {pending ? <Spinner /> : 'Save'}
        </Button>
      </footer>
    </div>
  )
}
