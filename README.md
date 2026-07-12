# Eisenhower Matrix

A modern, interactive web-based task prioritization tool based on the Eisenhower Matrix framework. Organize your tasks across four quadrants based on urgency and importance, with drag-and-drop support, due date tracking, and automatic local storage persistence.

## Features

### Task Management
- **Add tasks** to any of the four quadrants with a single input
- **Drag and drop** tasks between quadrants for quick reorganization
- **Edit task titles** inline by clicking the title text
- **Set due dates** for each task with visual indicators
- **Delete tasks** with a single click
- **Search and filter** tasks by title or due date in real-time
- **Overdue indicators** show when tasks pass their due date
- **Clean line icons** for each quadrant (▲ □ ◐ ✕)

### The Four Quadrants

| Quadrant | Urgency | Importance | Focus |
|----------|---------|------------|-------|
| **Do First** | Urgent | Important | Crisis management, deadlines |
| **Schedule** | Not Urgent | Important | Strategic work, planning |
| **Delegate** | Urgent | Not Important | Interruptions, operational tasks |
| **Eliminate** | Not Urgent | Not Important | Time wasters, low-value activities |

### User Experience
- **Keyboard shortcuts** for power users (see [SHORTCUTS.md](SHORTCUTS.md) for complete reference)
- **Context menu** for quick task movement (right-click or Ctrl/Cmd + click)
- **Real-time search** across task titles and dates
- **Visual feedback** for drag operations and selected tasks
- **Responsive design** works on desktop and mobile
- **Light & dark themes** — toggle with the ☾/○ button in toolbar, preference saved automatically
- **Undo/Redo support** (Ctrl/Cmd + Z / Ctrl/Cmd + R) — recover from mistakes
- **Overdue tasks float to top** — never miss what's actually urgent
- **Quick-add shortcuts** — Ctrl+Shift+1-4 to add directly to any quadrant

### Mobile Optimizations
- **"+" button in each quadrant** — tap to add a task directly to that quadrant
- **Simplified mobile form** — quick task entry with optional due date
- **Search bar with theme toggle** at top for easy access
- **Action buttons at bottom** — Export, Import, and Reset buttons positioned below the matrix
- **Minimalist line-style icons** — clean, professional design (▲ □ ◐ ✕ ○ ☾)
- **Touch-friendly layout** — large tap targets, optimized spacing
- **Hidden keyboard shortcuts** — reference not shown on mobile for cleaner interface

### Data Persistence
- **Auto-save to browser localStorage** — no server required
- **Load your tasks automatically** when revisiting the page
- **Export tasks** as JSON for backup or sharing (↓ Export button)
- **Import tasks** from JSON file with merge or replace options (↑ Import button)
- **Reset option** to clear your entire matrix when starting fresh

## How to Use

### Adding Tasks

**Desktop:**
1. Type your task in the "What needs attention?" input field
2. Choose how to add:
   - **Standard**: Select quadrant from dropdown, then press **Ctrl/Cmd + Enter** or click "Add card"
   - **Quick-add**: Press **Ctrl + Shift + 1/2/3/4** to add directly to Do First/Schedule/Delegate/Eliminate (skips dropdown)
3. Your task appears in the selected quadrant

**Mobile:**
1. Tap the **+** button in the center-bottom of any quadrant
2. Enter your task title in the modal form
3. Optionally set a due date
4. Tap "Add" to create the task

### Managing Tasks

**Moving tasks:**
- Drag a card to another quadrant
- Right-click a card and select "Move to"
- Use **1–4 number keys** to move selected task (1=Do First, 2=Schedule, 3=Delegate, 4=Eliminate)

**Editing tasks:**
- Click a card to select it (shows blue highlight)
- Click the task title to edit, or press **E** while selected
- Click away or press Enter to save changes

**Setting due dates:**
- Click a task card to select it
- Use the date picker that appears below the title
- Overdue tasks show a red "Overdue" badge

**Deleting tasks:**
- Click the **×** button on any card, or
- Select a card and press **Delete** or **Backspace**

**Finding tasks:**
- Press **Ctrl/Cmd + F** to open search
- Type to filter by task name or due date
- Clear the search to see all tasks again

**Recovering from mistakes:**
- **Undo** an action (add, delete, move, edit) with **Ctrl/Cmd + Z**
- Restores the previous state of your matrix
- You can only undo the most recent change

**Overdue visibility:**
- Overdue tasks automatically float to the top of their quadrant
- Ensures urgent tasks are never buried below others
- Overdue status is checked against today's date

**Backing up and moving data:**
- **Export**: Click ↓ Export in the toolbar to download your tasks as a JSON file (named with today's date)
- **Import**: Click ↑ Import to load tasks from a previously exported file
- Choose to **merge** with existing tasks or **replace** them entirely
- Useful for backup, sharing with others, or moving between devices

### Keyboard Shortcuts

See [SHORTCUTS.md](SHORTCUTS.md) for the complete keyboard shortcut reference.

**Essential shortcuts:**

| Shortcut | Action |
|----------|--------|
| **Ctrl/Cmd + Enter** | Add task to selected quadrant |
| **Ctrl + Shift + 1–4** | Quick-add to specific quadrant |
| **Click title** | Edit task inline |
| **E** | Edit selected task |
| **1–4** | Move selected task to quadrant |
| **↑** / **↓** | Reorder task within quadrant |
| **Ctrl/Cmd + Z / R** | Undo / Redo |
| **Ctrl/Cmd + F** | Search tasks |
| **Esc** | Context-aware exit (edit → deselect → dialogs) |

## Technical Details

### Stack
- **HTML5** — semantic markup
- **CSS3** — custom properties, grid layout, animations
- **JavaScript (Vanilla)** — no dependencies, pure ES6+

### Storage
- Tasks are stored in browser's `localStorage` under the key `eisenhower-matrix-state`
- Each task object contains:
  - `id` — unique identifier (UUID or timestamp-based)
  - `title` — task description
  - `dueDate` — optional date in YYYY-MM-DD format
  - `quadrant` — one of: `do`, `schedule`, `delegate`, `eliminate`
- No data is sent to servers — everything stays local

### Browser Compatibility
- Modern browsers with ES6 support (Chrome, Firefox, Safari, Edge)
- Requires `localStorage` support (available in all modern browsers)
- Requires Drag and Drop API support
- Optional: `crypto.randomUUID()` for unique task IDs (fallback to timestamp-based IDs)

### Notable Features in Code
- **XSS Protection** — task titles are HTML-escaped to prevent injection
- **URL Detection** — links in task titles are automatically converted to clickable anchors
- **Date Formatting** — uses Intl API for locale-aware date formatting
- **Accessibility** — semantic HTML, ARIA labels, screen-reader text
- **Responsive** — mobile-friendly with single-column layout below 900px

## Quick Start

Open `index.html` in your web browser and start adding tasks. No build process, no dependencies, no installation required.

**Don't know the shortcuts?** Check [SHORTCUTS.md](SHORTCUTS.md) for a quick reference of all keyboard commands.

## Getting Started

### Local Development
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start adding tasks!

No build process, no dependencies, no installation required. It's a standalone HTML file that works immediately.

### Using with MAMP (or any local server)
If serving through MAMP or another local server:
```bash
# Navigate to the project directory
cd /Applications/MAMP/htdocs/eisenhower-matrix

# Open in browser (MAMP default)
open http://localhost:8888/eisenhower-matrix/
```

## Tips for Effective Prioritization

### The Eisenhower Method
1. **Do First (Urgent & Important):** Handle these immediately. Crisis, deadlines, problems.
2. **Schedule (Important & Not Urgent):** These drive success. Plan time for strategic work, skill development, prevention.
3. **Delegate (Urgent & Not Urgent):** These demand attention but don't require your specific skills. Assign to others.
4. **Eliminate (Neither Urgent nor Important):** These are time wasters. Remove them or minimize ruthlessly.

### Best Practices
- Review your matrix daily
- Move items up as deadlines approach
- Invest time in "Schedule" — this is where real progress happens
- Don't let "Delegate" become a dumping ground — actually assign tasks
- Regularly audit "Eliminate" to stay focused

## File Structure

```
eisenhower-matrix/
├── index.html      # Main markup and structure
├── style.css       # Styling and animations
├── script.js       # Interactivity and state management
└── README.md       # This file
```

## Hosting & SEO

This app is hosted on GitHub Pages with a custom domain. 

**SEO improvements implemented:**
- ✅ Meta tags and descriptions optimized for search engines
- ✅ Open Graph tags for social media sharing
- ✅ robots.txt and sitemap.xml for indexing
- ✅ JSON-LD structured data for rich snippets
- ✅ Canonical URL configured

See [SEO.md](SEO.md) for setup instructions and monitoring guidance.

## License

Open source — use freely for personal or commercial projects.

## Contributing

Found a bug or have a feature idea? Feel free to improve this tool!

---

**Built with simplicity in mind.** No frameworks, no clutter, just a tool that works.
