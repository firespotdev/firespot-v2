# UI Design System & Component Reuse Rules

When developing or refactoring UI features in `@firespot-two`, always prioritize reusing central components from `@/components/ui`. Avoid introducing ad-hoc inline Tailwind classes for card shadows, status badges, menu lists, and circular close buttons.

## 1. Card Containers (`AppCard`)
- Always use `<AppCard>` from `@/components/ui` for card containers, modals, and list containers requiring standard shadows (`shadow-[0px_4px_8px_0px_#0000000A]`) or border dividers.
- Do NOT hardcode custom drop-shadow strings (`shadow-[0px_4px_...`) in inline elements.

## 2. Action & Option Lists (`ActionList` / `ActionListItem`)
- Use `<ActionList>` and `<ActionListItem>` from `@/components/ui` for grouped list options, setting menus, drawer choices, and action items.
- Support `icon`, `title`, `subtitle`, `badge`, `trailing`, `danger`, `disabled`, and `href` props.

## 3. Status Badges & Indicators (`StatusBadge`)
- Use `<StatusBadge status={sale.status} />` from `@/components/ui` for transaction/sale status displays (`CONFIRMED`, `PENDING`, `CANCELLED`, `ARCHIVED`, `EDITED`).
- Avoid recreating status color maps or badge pills manually.

## 4. Stat & Amount Summary Banners (`StatBanner`)
- Use `<StatBanner>` from `@/components/ui` for KPI metric cards, daily total sales banners, and amount summary cards.

## 5. Filter Capsules (`FilterCapsule`)
- Use `<FilterCapsule>` from `@/components/ui` for filter chips, tab capsules, and choice pills.

## 6. Circular Action & Close Buttons (`CircularIconButton`)
- Use `<CircularIconButton>` from `@/components/ui` for drawer header close/back buttons (`X`, `ChevronDown`, `ArrowLeft`).
