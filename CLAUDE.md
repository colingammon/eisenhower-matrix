# Eisenhower Matrix — Claude Code Guidelines

## Project Overview

A lightweight, dependency-free task prioritization app using the Eisenhower Matrix framework. Tasks are organized into four quadrants (Do First, Schedule, Delegate, Eliminate) with drag-and-drop support, due date tracking, and localStorage persistence.

**Key Principles:**
- Zero dependencies (vanilla JS, HTML, CSS only)
- No build process — works as-is in any browser
- Keyboard-first interaction (comprehensive shortcut support)
- Accessibility built-in (ARIA labels, semantic HTML, screen reader text)
- Data stays local (localStorage only, no backend/API)

## Tech Stack

- **HTML5**: Semantic markup with ARIA labels
- **CSS3**: Custom properties, CSS Grid, flexbox, animations
- **JavaScript**: ES6+, vanilla (no frameworks/libraries)
- **Storage**: `localStorage` only (STORAGE_KEY = 'eisenhower-matrix-state')
- **Deployment**: Static hosting (MAMP, GitHub Pages, Netlify, etc.)

## Project Structure

```
eisenhower-matrix/
├── index.html       # HTML structure + favicon definition
├── style.css        # Styling, animations, responsive design
├── script.js        # All interactivity and state management
├── CLAUDE.md        # This file
└── README.md        # User-facing documentation
```

## Code Style & Conventions

### JavaScript

**State Management:**
- Single source of truth: `tasks` array
- Always call `saveTasks()` after mutations
- Always call `render()` after state changes
- Pattern: mutate → save → render

**Function Organization:**
- Utilities at top (escapeHtml, formatDate, isTaskOverdue, etc.)
- State functions (loadTasks, saveTasks)
- UI functions (render, createCard elements)
- Event handlers (drag, keyboard, click, form submit)
- Initialize at bottom (event listeners, initial render)

**Naming:**
- Task properties: `id`, `title`, `dueDate`, `quadrant`
- Quadrants: strings — `'do'`, `'schedule'`, `'delegate'`, `'eliminate'`
- Elements: camelCase — `titleInput`, `taskForm`, `resetDialog`
- Event handlers: `handle*` or `on*` — `handleDragStart`, `handleKeyboardShortcuts`
- Display functions: `*Menu`, `*Dialog`, `*Task` — `openContextMenu`, `closeResetDialog`

**Security:**
- Always escape user input with `escapeHtml()` before inserting into DOM
- Use `textContent` for plain text, `innerHTML` only with escaped/safe content
- URL pattern matching is safe (controlled regex, `target="_blank" rel="noopener noreferrer"`)

### CSS

**Custom Properties (defined at `:root`):**
- `--bg`: Dark background
- `--panel`: Semi-transparent panels
- `--text`: Primary text color
- `--muted`: Secondary/muted text
- `--accent`: Primary action color (#5c7cff)
- `--border`: Border color
- `--shadow`: Drop shadow

**Naming Convention:**
- Block: `.quadrant`, `.task-card`, `.context-menu`
- Element: `.task-card__title`, `.quadrant__header`
- Modifier: `.task-card--overdue`, `.is-selected`, `.is-dragging`
- Pattern: BEM (Block-Element-Modifier)

**Responsive Design:**
- Desktop-first (2-column grid)
- Mobile breakpoint: `@media (max-width: 900px)` → 1-column layout
- Use `clamp()` for fluid font sizes
- Ensure touch targets are ≥44px

### HTML

**Accessibility:**
- Use semantic HTML (`<article>`, `<section>`, `<button>`, `<input>`)
- Add `aria-label` to icon-only buttons
- Use `.sr-only` class for screen-reader-only text
- All form inputs have associated `<label>` (visible or `.sr-only`)
- Use `role="dialog"` and `aria-modal="true"` for modals

**Data Attributes:**
- Use `data-*` for JS selectors: `data-id`, `data-quadrant`
- Keep structure clean — avoid inline styles

## Key Workflows

### Adding a Task

**Standard flow (Ctrl/Cmd+Enter):**
1. User selects quadrant from dropdown
2. Submits form (Ctrl/Cmd+Enter or button click)
3. `addTaskToQuadrant()` creates task object with UUID
4. `saveUndo()` backs up current state
5. Task pushed to `tasks` array
6. `saveTasks()` persists to localStorage
7. `render()` refreshes UI (sorts by overdue status)
8. Form cleared, focus restored to input

**Quick-add flow (Shift+Ctrl/Cmd+1-4):**
1. User presses Shift+Ctrl/Cmd+1/2/3/4 (quadrant shortcut)
2. Same as standard flow, but quadrant is determined by key, not dropdown
3. Faster for users frequently adding to same quadrant

**Mobile "+" button flow:**
1. User taps "+" button in bottom-right corner of a quadrant
2. `openAddTaskDialog()` opens modal with form for that quadrant
3. User enters title (required) and optional due date
4. Submit form → `addTaskFromDialog()` creates task
5. `saveUndo()` backs up state, `saveTasks()` persists
6. `render()` updates UI, modal closes automatically
7. `pendingQuadrantForAdd` cleared for next use

**Escape key behavior in mobile dialog:**
1. Escape closes the add task dialog (`closeAddTaskDialog()`)
2. Resets `pendingQuadrantForAdd` and clears form

### Undoing and Redoing Actions

**Undo flow (Ctrl/Cmd+Z):**
1. User presses Ctrl/Cmd+Z
2. `undo()` saves current state to `nextTasks` (for potential redo)
3. Restores state from `previousTasks` backup
4. Clears `previousTasks` (only one level of undo)
5. `saveTasks()` and `render()`

**Redo flow (Ctrl/Cmd+R):**
1. User presses Ctrl/Cmd+R (only works if undo was just called)
2. `redo()` saves current state to `previousTasks` (for potential undo)
3. Restores state from `nextTasks` backup
4. Clears `nextTasks` (redo is single-use)
5. `saveTasks()` and `render()`

**Key behavior:**
- Redo is only available immediately after undo
- Any new action (add, delete, move, edit) clears `nextTasks`, making redo unavailable
- This prevents confusing redo chains

**When backups are created (`saveUndo()` is called):**
- Before `addTaskToQuadrant()` (add)
- Before `removeTask()` (delete)
- Before `moveTask()` (move)
- Before `saveEdit()` (edit) — only if title actually changes
- Before `resetMatrix()` (reset)

### Moving a Task

**Via drag-and-drop:**
1. `handleDragStart()` captures dragged task ID
2. Drop on dropzone → `moveTask(taskId, quadrant)`
3. Task removed from array, quadrant updated, re-inserted
4. `saveTasks()` and `render()`

**Via keyboard (1–4):**
- `handleKeyboardShortcuts()` detects number key + selected task
- Calls `moveTask(selectedTaskId, quadrantMap[key])`

**Via context menu:**
- Right-click card → `openContextMenu()` with mouse coordinates
- Click menu item → `handleContextMenuSelection(quadrant)`

### Editing a Task

1. Click card or press E while selected
2. `beginEdit()` converts card to editable input
3. User types, presses Enter/Escape/click away
4. `saveEdit()` updates title, saves, renders

### Escape Key Behavior (Context-Aware)

The Esc key serves multiple purposes, prioritized in this order:

1. **Close add task dialog** — If mobile add dialog is open, close it
2. **Close reset dialog** — If reset dialog is open, close it
3. **Exit edit mode** — If in task title edit mode, save and exit
4. **Deselect task** — If a task is selected, deselect it (remove blue highlight)
5. **Do nothing** — If none of the above, key is ignored

This creates a natural "unwinding" of state with a single key.

### Sorting and Displaying Tasks

**Overdue tasks float to top:**
1. In `render()`, filter tasks for each quadrant
2. Sort by `isTaskOverdue()` — overdue first, then non-overdue
3. Stable sort preserves user's manual reordering within each group
4. Display order updates whenever `render()` is called
5. Reordering with arrow keys still works on logical array order

**Search filtering:**
- Real-time as user types in search input
- `matchesSearch(task)` checks title + dueDate
- `render()` filters and sorts cards for each quadrant

### Resetting Matrix

1. Click "Reset matrix" button
2. Confirmation dialog appears
3. User clicks "Reset" (danger button)
4. `resetMatrix()` clears tasks array, saves, renders
5. Dialog closes

## Performance & UX Considerations

**Rendering:**
- `render()` rebuilds all quadrants every change
- Uses `documentFragment` for batch DOM inserts (efficient)
- Could optimize with targeted updates, but current approach is simple and fast enough

**Keyboard Shortcuts:**
- All shortcuts respect `isTypingTarget()` (don't trigger in input/textarea)
- Dialog escape key is explicit (doesn't conflict with general escape handling)

**Drag & Drop:**
- Uses native HTML5 Drag and Drop API
- Visual feedback: `.is-dragging` on source, `.is-target` on hover zones
- Cleanup on `dragend`

**localStorage:**
- Synchronous (no async needed)
- Try-catch wraps load to handle quota errors gracefully
- Save happens on every mutation (acceptable for this app's scale)

## Accessibility Standards

**WCAG 2.1 Level AA compliance:**
- Color contrast: 4.5:1 for text (blue #5c7cff on dark #07111f)
- Keyboard navigation: all functions accessible via keyboard
- Screen readers: semantic HTML + ARIA labels
- Focus management: visible focus states (blue border on cards)
- Interactive elements: ≥44px touch targets

**Testing checklist:**
- Tab through entire UI, confirm logical tab order
- Use keyboard shortcuts only (no mouse)
- Check with screen reader (built into OS)
- Verify color contrast with tool (check critical elements)

## Common Tasks

### Add a New Keyboard Shortcut

1. Add condition in `handleKeyboardShortcuts()`
2. Check `isTypingTarget()` if shortcut shouldn't work in inputs
3. Use `event.preventDefault()` before handling
4. Update [SHORTCUTS.md](SHORTCUTS.md) — the single source of truth for shortcuts
5. Update shortcut summary in README.md (optional, if it's a common one)
6. Update hero section description in index.html (optional)
7. Test with different input focus states

**For the complete current list, see [SHORTCUTS.md](SHORTCUTS.md)**

Key implementation notes:
- Ctrl+Shift+1-4: Ctrl only (not Cmd) to avoid Mac system screenshot conflicts
- Esc is context-aware: dialogs → edit mode → selection
- Undo/redo: single-level only, redo clears on new action
- All shortcuts respect `isTypingTarget()` to avoid triggering in inputs

### Change Colors

Edit `:root` custom properties in style.css:
```css
:root {
  --accent: #5c7cff;  /* Change this */
  --accent-soft: rgba(92, 124, 255, 0.18);  /* Update this too */
}
```

Also update quadrant backgrounds:
```css
.quadrant--do { background: rgba(92, 124, 255, 0.22); }
```

### Add a New Feature

**Pattern:**
1. Design data structure (update task object if needed)
2. Implement state mutation in script.js
3. Update render to display it
4. Add keyboard/UI controls
5. Test end-to-end
6. Update README.md
7. Update this CLAUDE.md if it changes workflows

### Deploy

1. Ensure all files are in sync
2. No build step — just copy files to hosting
3. Test on staging server
4. Verify localStorage works (browser dev tools)
5. Check on actual devices/browsers

## Debugging Tips

**localStorage inspection:**
```js
// In browser console:
JSON.parse(localStorage.getItem('eisenhower-matrix-state'))
localStorage.removeItem('eisenhower-matrix-state')  // Clear data
```

**UI state debugging:**
```js
// In console:
console.log(tasks)           // All tasks
console.log(selectedTaskId)  // Currently selected
console.log(draggedTaskId)   // Currently being dragged
render()                      // Force re-render
```

**Keyboard event debugging:**
```js
// Add to handleKeyboardShortcuts() temporarily:
console.log(event.key, event.ctrlKey, event.metaKey)
```

## Recent Additions

**v1.4 Features (Mobile Enhancements):**
- **Quadrant "+" buttons** — Tap to add a task directly to each quadrant (bottom-right corner)
- **Mobile add modal** — Simplified form with title + optional due date
- **Optimized mobile toolbar** — Search + theme toggle at top, action buttons at bottom
- **Minimalist icon updates** — Theme toggle now uses ☾ (moon) for dark and ○ (circle) for light
- **Responsive action buttons** — Export, Import, Reset positioned below matrix on mobile
- **Hidden keyboard help** — Shortcut reference hidden on mobile for cleaner interface

**v1.3 Features:**
- **Export/Import JSON** — Download tasks as backup or share via file
- **Merge or replace on import** — Keep existing tasks or start fresh
- **Date-stamped exports** — Backups named with YYYY-MM-DD for easy organization

**v1.2 Features:**
- **Light & dark themes** — Toggle ☾/○ button in toolbar, preference saved to localStorage
- **Clean line icons** — Replaced emoji with simple line-style icons (▲ □ ◐ ✕) for quadrants
- **Improved light mode** — White background, high-contrast text, bright readable cards and badges
- **Flat design** — Removed all gradients for clean, modern aesthetic
- **Better button visibility** — Darker Reset button in light mode for emphasis

**v1.1 Features:**
- **Undo & Redo** — Ctrl/Cmd+Z/R for single-level undo/redo (only available after undo)
- **Overdue sorting** — Overdue tasks float to top of each quadrant
- **Quick-add** — Ctrl+Shift+1-4 adds directly to specific quadrant (Ctrl only to avoid Mac conflicts)
- **Context-aware Escape** — Closes dialogs → exits edit mode → deselects task

## Browser Compatibility Notes

- **ES6 features used**: Arrow functions, const/let, template literals, destructuring
- **Modern APIs used**: Fetch (not used), localStorage, crypto.randomUUID()
- **CSS features used**: Grid, custom properties, clamp()
- **Fallback**: Non-UUID browsers get timestamp-based IDs

**Tested on:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements (Non-Goals)

These are intentionally NOT priorities for this project:
- Backend sync (defeats "local first" philosophy)
- Task categories/tags (quadrants are enough)
- Recurring tasks
- Task descriptions (keep it minimal)
- Export/import (localStorage is good enough)
- Multi-level undo/redo (single-level is simple and sufficient)
- Notifications/reminders (adds system complexity)
- Custom colors/branding (current palette is intentional and accessible)

The project is deliberately simple. Resist feature creep.

## Notes for Claude

When working on this codebase:

1. **Preserve simplicity.** No dependencies means fast load, easy to understand, runs everywhere. Keep it that way.

2. **Test in browser.** Type checking won't catch UI bugs. Always test the feature in a real browser after changes.

3. **Keyboard-first.** Any new interaction should have keyboard support. Check `handleKeyboardShortcuts()` and update shortcuts docs.

4. **Accessibility matters.** This is a task app — people with various abilities use it. Test with screen reader, check color contrast, ensure keyboard works.

5. **localStorage is your DB.** Always follow the pattern: mutate → saveTasks() → render(). Never mutate without saving.

6. **Security: escape user input.** Task titles come from users. Always use `escapeHtml()` before inserting into DOM.

7. **Responsive design.** Test on mobile (use browser dev tools). The 900px breakpoint switches to single column.

8. **Update docs.** If behavior changes, update README.md (user-facing) and this file (developer-facing).

---

Built for clarity, simplicity, and focus. ⚡
