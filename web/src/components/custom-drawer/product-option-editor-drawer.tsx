'use client'

import { useState } from 'react'
import { ArrowLeft, GripVertical, Trash2 } from 'lucide-react'
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
import type {
  ProductOption,
  ProductOptionValue,
} from '@/services/products/productsApi'

interface ProductOptionEditorDrawerProps {
  option?: ProductOption
  onSave: (option: ProductOption) => void
  closeDrawer: () => void
}

const makeId = () =>
  typeof crypto !== 'undefined'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

function SortableOptionValueRow({
  value,
  index,
  onChange,
  onRemove,
}: {
  value: ProductOptionValue
  index: number
  onChange: (id: string, nextValue: string) => void
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id })

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
        aria-label={`Drag to reorder option value ${index + 1}`}
        className="shrink-0 flex h-9 w-9 items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <Input
        value={value.value}
        onChange={(event) => onChange(value.id, event.target.value)}
        placeholder={index ? 'Add another value' : 'Add a value'}
        className="h-9"
      />
      <button
        type="button"
        onClick={() => onRemove(value.id)}
        aria-label="Remove option value"
        className="h-9 w-9 shrink-0 flex items-center justify-center"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export function ProductOptionEditorDrawer({
  option,
  onSave,
  closeDrawer,
}: ProductOptionEditorDrawerProps) {
  const [name, setName] = useState(option?.name || '')
  const [values, setValues] = useState(
    option?.values.length
      ? [...option.values, { id: makeId(), value: '' }]
      : [{ id: makeId(), value: '' }],
  )
  const [isSaving, setIsSaving] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const updateValue = (id: string, value: string) => {
    setValues((current) => {
      const index = current.findIndex((item) => item.id === id)
      const next = current.map((item) =>
        item.id === id ? { ...item, value } : item,
      )
      return index === current.length - 1 && value.trim()
        ? [...next, { id: makeId(), value: '' }]
        : next
    })
  }

  const removeValue = (id: string) => {
    setValues((current) => {
      const next = current.filter((item) => item.id !== id)
      if (!next.length) return [{ id: makeId(), value: '' }]
      return next.at(-1)?.value.trim()
        ? [...next, { id: makeId(), value: '' }]
        : next
    })
  }

  const reorderValues = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setValues((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id)
      const newIndex = current.findIndex((item) => item.id === over.id)
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  const save = () => {
    const cleanName = name.trim()
    const cleanValues = values
      .map((value) => ({ ...value, value: value.value.trim() }))
      .filter((value) => value.value)
    if (!cleanName || !cleanValues.length) {
      showNotificationToast({
        message: 'Add an option name and at least one value.',
      })
      return
    }
    setIsSaving(true)
    onSave({ id: option?.id || makeId(), name: cleanName, values: cleanValues })
    setIsSaving(false)
    closeDrawer()
  }

  return (
    <div className="flex h-dvh max-w-125 flex-col bg-white font-satoshi">
      <header className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Back"
          className="p-1.5"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[16px] font-bold">
          {option ? 'Edit option' : 'Add option'}
        </h2>
        <span className="w-8" aria-hidden="true" />
      </header>

      <main className="flex-1 px-3 pt-4">
        <div>
          <Label>Option name</Label>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="eg. color, size, flavor"
          />
        </div>
        <div className="mt-6">
          <Label>Option values</Label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={reorderValues}
          >
            <SortableContext
              items={values.map((value) => value.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {values.map((value, index) => (
                  <SortableOptionValueRow
                    key={value.id}
                    value={value}
                    index={index}
                    onChange={updateValue}
                    onRemove={removeValue}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </main>

      <footer className="flex justify-end gap-4 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          onClick={closeDrawer}
          className="h-10 w-auto px-4"
        >
          Cancel
        </Button>
        <Button onClick={save} disabled={isSaving} className="h-10 w-auto px-7">
          {isSaving ? <Spinner /> : 'Save'}
        </Button>
      </footer>
    </div>
  )
}
