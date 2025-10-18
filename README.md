# Image Gallery Web Application

A minimalistic, modern web-based image gallery with slideshow functionality and file management capabilities.

## Features

- 🖼️ **Thumbnail Grid View** - Displays all images from the parent directory in a responsive grid layout
- 🔍 **Lightbox Gallery** - Click any thumbnail to open a full-screen lightbox view using PhotoSwipe
- ▶️ **Auto Slideshow** - Automatic slideshow with adjustable interval (1-10 seconds, default 3s)
- 🗑️ **Delete Files** - Delete images directly without confirmation popup
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🎨 **Minimalistic UI** - Clean, modern dark theme interface
- 🚀 **Fast Loading** - No thumbnail generation required; uses CSS scaling with lazy loading

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

## Requirements

- **Node.js** 18+ recommended (tested on Node.js 18+)
- **npm** (comes with Node.js)
- **macOS, Linux, or Windows**

## Installation

1. Navigate to the project directory:
```bash
cd /Users/augustinas_the_fox/Downloads/app_mac
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Start the Server

#### Production Mode
```bash
npm start
```

#### Development Mode (with auto-reload)
```bash
npm run dev
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

The application will serve images from the **parent directory** (`/Users/augustinas_the_fox/Downloads/`).

## Project Structure

```
app_mac/
├── server.js           # Express server with ImageService class
├── package.json        # npm dependencies and scripts
├── README.md          # This file
└── public/            # Frontend static files
    ├── index.html     # HTML structure
    ├── style.css      # Minimalistic styles
    └── app.js         # Frontend logic (OOP architecture)
```

## Configuration

### Change Port

Set the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### Change Images Directory

Edit `server.js` line 11:
```javascript
const IMAGES_DIR = path.resolve(APP_ROOT, '..') // Change this path
```

### Adjust Slideshow Default Interval

Edit `public/app.js` line 11:
```javascript
this.intervalMs = 3000 // Change to desired milliseconds
```

Or use the UI slider to adjust on-the-fly (1-10 seconds).

## API Reference

### GET `/api/images`

Returns a JSON array of all image files.

**Response:**
```json
{
  "files": [
    {
      "name": "image1.jpeg",
      "url": "/images/image1.jpeg"
    }
  ]
}
```

### GET `/images/:filename`

Serves an individual image file.

**Parameters:**
- `filename` - URL-encoded filename

**Response:** Image file (JPEG, PNG, or WebP)

### DELETE `/api/images/:filename`

Deletes an image file (no confirmation required).

**Parameters:**
- `filename` - URL-encoded filename

**Response:**
```json
{
  "ok": true
}
```

**Error Response:**
```json
{
  "error": "Delete failed"
}
```

## Security Features

- **Path Traversal Protection** - Blocks filenames with path separators (`/`, `\`)
- **Extension Whitelist** - Only allows `.jpg`, `.jpeg`, `.png`, `.webp`
- **Directory Isolation** - All operations restricted to `IMAGES_DIR`
- **Input Validation** - Validates all filenames before file operations
- **CORS Enabled** - Ready for cross-origin requests if needed

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **cors** - CORS middleware
- **morgan** - HTTP request logger

### Frontend
- **PhotoSwipe v5** - Lightbox gallery (loaded from CDN)
- **Vanilla JavaScript** - OOP architecture with ES6 modules
- **CSS3** - Modern, responsive design with CSS variables

## How It Works

1. **Server Initialization** - Express server starts and serves static files from `public/`
2. **Image Discovery** - Server scans parent directory for allowed image files
3. **Frontend Load** - Browser loads HTML, CSS, and JavaScript module
4. **Gallery Render** - JavaScript fetches image list and renders thumbnail grid
5. **Lightbox Integration** - PhotoSwipe initializes for full-screen viewing
6. **Slideshow Control** - Custom slideshow controller manages auto-play timing
7. **Delete Action** - Frontend sends DELETE request, removes tile on success

## Classes and Architecture

### Backend: `ImageService` Class
- `listImages()` - Returns sorted array of image filenames
- `isAllowedFilename(name)` - Validates filename for security
- `delete(name)` - Deletes file after validation

### Frontend: OOP Design
- **`GalleryApp`** - Main application controller
  - Manages image loading, rendering, deletion
  - Initializes PhotoSwipe lightbox
- **`SlideshowController`** - Slideshow functionality
  - Controls play/pause state
  - Manages interval timing
  - Integrates with PhotoSwipe

## Troubleshooting

### No Images Appear
- Check that images exist in the parent directory
- Verify image extensions are `.jpg`, `.jpeg`, `.png`, or `.webp`
- Check browser console for errors

### Port Already in Use
- Change the port: `PORT=8080 npm start`
- Or kill the process using port 3000

### Delete Not Working
- Ensure server has write permissions to the parent directory
- Check browser console for error messages

### Slideshow Not Starting
- Slideshow only starts when the lightbox is opened
- Click any thumbnail to open the lightbox
- Click "Play" button if slideshow doesn't auto-start

## Limitations

- **Single Directory** - Only scans immediate parent directory (not recursive)
- **No Thumbnail Cache** - Uses original images scaled by CSS
- **No Authentication** - Anyone with access can view and delete images
- **No Undo** - File deletion is permanent (no confirmation popup)

## Future Enhancements

- Lazy-load images with IntersectionObserver for large directories
- Keyboard shortcuts (Space for play/pause, +/- for interval)
- Delete button inside PhotoSwipe toolbar
- Display image metadata (dimensions, file size)
- Pagination or virtualized grid for thousands of images
- Drag-and-drop upload functionality
- Search/filter by filename

## License

ISC

## Author

Created with ❤️ for managing local image collections
