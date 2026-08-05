export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  selectedVariant?: {
    size?: string
    color?: string
  }
}

export type CheckoutMode = 'record' | 'collect' | 'preview'

/**
 * Whether the sheet creates a new sale, edits an existing one, or confirms a
 * customer-initiated pending sale. Held as state rather than read from props
 * so a successful confirm/edit can fall back to 'create' for the next sale.
 */
export type SaleMode =
  | { kind: 'create' }
  | { kind: 'edit'; id: string }
  | { kind: 'confirm'; id: string }

/** Synthetic id for the amount currently typed on the keypad but not yet added. */
export const DRAFT_ITEM_ID = 'custom-current-draft'
