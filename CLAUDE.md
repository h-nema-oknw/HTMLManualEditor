# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTMLManualEditor is a WYSIWYG web editor for creating/editing HTML manuals and documents. Users can build layouts, edit text, insert images, manipulate tables, etc. without HTML/CSS knowledge. The app is a static SPA deployed to IIS.

## Language

This project's documentation and UI are in Japanese. Commit messages, code comments, and communication should be in Japanese unless otherwise requested.

## Build & Dev Commands

All commands run from `editor-app/`:

```bash
cd editor-app
npm start                              # Dev server (localhost:3000)
npm test                               # Run tests (Jest)
BUILD_PATH=./output npx react-scripts build  # Production build to output/
```

Deploy target: `editor-app/output/` -> `C:/inetpub/wwwroot/HTMLManualEditor/`

**Important:** `package.json` has `"homepage": "/HTMLManualEditor/"`. Changing the deploy path requires updating this field and rebuilding.

## Architecture

React 19 + TypeScript + Zustand + Create React App. The app has a 4-panel layout:

```
Toolbar (top)
├── ElementTree (left)   - DOM tree visualization
├── HtmlPreview (center) - iframe-based WYSIWYG preview
└── PropertiesPanel (right) - CSS/attribute editor
```

### Data Flow

All component communication goes through the Zustand store (`store.ts`). The store holds the current HTML string, selected element path, editing state, and zoom level.

### Core Module: iframeManager.ts

This is the most critical file. It's a singleton class that manages all DOM operations inside the preview iframe:
- Element selection, inline editing, drag-and-drop reordering
- HTML5 DnD from toolbar to iframe for element insertion
- Table operations (row/column add/delete/swap, overlay UI with handles)
- Image insertion with Base64 encoding
- Style/attribute get/set for the properties panel
- MutationObserver for change detection
- Editor-specific CSS injection into the iframe

### domSerializer.ts

Strips editor-specific elements/attributes from iframe DOM to produce clean HTML for save/export.

### historyManager.ts

Stack-based Undo/Redo (max 50 entries). Supports Ctrl+Z / Ctrl+Y.

## Key Constraints

- Images are Base64-embedded in HTML (no external image hosting)
- Column layouts support nesting up to 2 levels deep
- `editor-vite/` is a legacy Vite version and is unused
- Multiple build folders exist (`build`, `build2`...`build5`); `output/` is the current deploy target
