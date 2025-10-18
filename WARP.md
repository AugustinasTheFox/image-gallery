# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

Image Gallery is a local web application for browsing, viewing, and managing image collections from your filesystem. It consists of:
- **Backend**: Node.js/Express server that provides a REST API for filesystem operations
- **Frontend**: Vanilla JavaScript SPA with no build step required

## Development Commands

### Running the Application

```bash
# Start the server (production mode)
npm start

# Start with auto-reload (development mode)
npm run dev
```

The server runs on port 3001 by default (configurable via `PORT` environment variable).

### Configuration

Set `ALLOWED_BASE_DIRS` environment variable to restrict filesystem access:
```bash
ALLOWED_BASE_DIRS="/Users/username/Pictures:/Users/username/Documents" npm start
```

Without this variable, the application can access all filesystem paths (use with caution).

## Architecture

### Backend (server.js)

**Key Components:**
- `encodePath/decodePath`: Base64-url-safe encoding for file paths passed via HTTP
- `validatePath`: Security check ensuring paths are within allowed directories (if configured)
- `isAllowedExtension`: Whitelist-based file type validation (.jpg, .jpeg, .png, .webp)

**API Endpoints:**
- `GET /api/health` - Health check
- `POST /api/load-directory` - Load all images from a directory (returns metadata)
- `GET /api/image?path={encodedPath}` - Serve image file with no-cache headers
- `DELETE /api/delete-image` - Delete an image file
- `GET /api/list-directory?path={encodedPath}` - Browse directory structure

**Security Model:**
- All file paths are base64-encoded in client-server communication
- Optional directory whitelist via `ALLOWED_BASE_DIRS`
- Extension whitelist prevents access to non-image files
- Path validation uses `fs.realpath` to prevent symlink/traversal attacks

### Frontend Architecture

**Three Main Classes:**

1. **ApiClient** (app.js)
   - Handles all backend communication
   - Provides image URL generation

2. **Gallery** (gallery.js)
   - Manages the image grid display
   - Handles image selection (individual, row, column, all)
   - Coordinates bulk deletion
   - Computes grid columns dynamically for selection logic

3. **Slideshow** (slideshow.js)
   - Full-screen image viewer with auto-advance
   - Keyboard navigation (arrow keys, space, escape, delete/X)
   - Syncs settings with gallery via Settings store

**State Management:**
- `window.appState` - Global state object containing instances of all components
- `Settings` class - Pub/sub pattern for slideshow settings (speed, pause state)
- Settings persisted in localStorage

**Component Communication:**
- Gallery calls `slideshow.show()` to open slideshow
- Slideshow calls `gallery.onExternalDeletion()` when images are deleted
- Both subscribe to Settings changes for synchronized controls

### Directory Structure

```
├── server.js              # Express backend
├── package.json           # Dependencies and scripts
└── public/
    ├── index.html         # Single-page HTML structure
    ├── css/
    │   └── style.css      # Styling (not analyzed)
    └── js/
        ├── app.js         # ApiClient, Settings, DirectoryBrowser, initialization
        ├── gallery.js     # Gallery grid management
        └── slideshow.js   # Fullscreen slideshow viewer
```

## Important Implementation Details

### Path Encoding
All file paths are transmitted between client and server using base64-url-safe encoding. This prevents issues with special characters in URLs:
- `+` → `-`
- `/` → `_`
- `=` padding removed

### Image Caching
Images are served with aggressive no-cache headers to ensure deleted images don't persist in browser cache.

### Selection Logic
The Gallery tracks grid columns by parsing `gridTemplateColumns` CSS property. This enables row/column selection based on visual layout.

### Slideshow Auto-Start
When opening slideshow, it automatically starts playing after 5 seconds, but respects the current pause state from Settings.

## Development Notes

- No build step required - pure vanilla JavaScript
- ES6 classes used throughout frontend
- CommonJS modules in backend (note `"type": "commonjs"` in package.json)
- All API calls use async/await pattern
- Images use lazy loading (`loading="lazy"` attribute)
