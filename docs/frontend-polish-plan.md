# Frontend Polish Plan

## Issue 1: JourneyCraft brand title overflow
**Cause**: `brand-title` font-size 1.3rem with text-shadow pushes text beyond 220px sidebar width.
**Fix**: Reduce font-size to 1.1rem, add `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` to sidebar-brand.

## Issue 2: Nav icons showing Unicode escapes (`\U0001f3de\ufe0f`)
**Cause**: DefaultLayout.vue nav items have Python-escaped Unicode strings, not actual emoji characters.
**Fix**: Replace all `\U0001f3de` style escapes with actual emoji characters.

## Issue 3: Navigation route result shows debug node IDs
**Cause**: `resolveNodeName()` falls back to "节点 xxx" for unresolved IDs. `visitOrder` displays raw graph node IDs.
**Fix**: 
- Remove the "最优访问顺序" section that displays raw node IDs
- Change segment display to only show place names, not internal node IDs
- Ensure `resolveNodeName()` uses actual place names

## Issue 4: Navigation missing multiple entry points
**Cause**: NavigationView only has AMap map + point selection. No links to AI plan, collaborative, or budget features.
**Fix**: Add a section at the top of NavigationView with quick-action buttons linking to:
- AI Plan (`/ai/plan`)
- Budget Planner (`/ai/budget`)
- Route from Map (current)

## Issue 5: Home page lacks AI tools visibility
**Cause**: AI features are hidden in sidebar. Users may not discover them.
**Fix**: Add a dashboard section with AI tools cards on the home page.

## Issue 6: Empty catch blocks hide errors
**Cause**: Multiple views use `catch {}` silently swallowing errors.
**Fix**: Add `console.error('Failed:', e)` to all empty catch blocks for easier debugging.

## Issue 7: Diary Detail v-html XSS risk
**Cause**: `v-html="rendered"` renders user-generated Markdown as HTML.
**Fix**: Acceptable for this project scope (user-generated content preview). No change needed.

## Feasibility Check
All fixes are CSS/JS changes only. No backend changes needed. All can be done in < 30 minutes.
