# Image Gallery

A local web application for browsing, viewing, and managing image collections from your filesystem.

## Features

- **Directory Browsing**: Navigate your filesystem to find image folders
- **Gallery View**: Grid-based display of images with lazy loading
- **Slideshow Mode**: Full-screen slideshow with auto-advance
- **Image Management**: Delete individual or multiple images
- **Selection Tools**: Select all, by row, by column, or individually
- **Keyboard Navigation**: Arrow keys, spacebar, and delete key support
- **Security**: Configurable directory whitelist and file type restrictions

## Installation

```bash
npm install
```

## Usage

### Start the server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

The application will be available at `http://localhost:3001`

### Configuration

**Security**: Restrict filesystem access by setting the `ALLOWED_BASE_DIRS` environment variable:

```bash
ALLOWED_BASE_DIRS="/Users/username/Pictures:/Users/username/Documents" npm start
```

**Port**: Change the default port using the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Supported Image Formats

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)

## Keyboard Shortcuts

### Gallery View
- Click image to open slideshow

### Slideshow Mode
- `←/→` - Previous/Next image
- `Space` - Pause/Play auto-advance
- `Escape` - Exit slideshow
- `Delete` or `X` - Delete current image

## Technology Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript (no build step required)
- **Dependencies**: cors, express, mime-types, morgan

## License

ISC
