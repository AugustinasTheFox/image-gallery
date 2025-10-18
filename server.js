const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mime = require('mime-types');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_BASE_DIRS = process.env.ALLOWED_BASE_DIRS 
  ? process.env.ALLOWED_BASE_DIRS.split(':') 
  : null;

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions

/**
 * Encode file path to base64-url safe format
 */
function encodePath(filePath) {
  return Buffer.from(filePath).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decode base64-url safe format to file path
 */
function decodePath(encoded) {
  try {
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const padding = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padding);
    
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch (err) {
    throw new Error('Invalid encoded path');
  }
}

/**
 * Validate that path is within allowed base directories (if configured)
 */
async function validatePath(filePath) {
  const resolvedPath = await fs.realpath(filePath).catch(() => filePath);
  
  if (ALLOWED_BASE_DIRS) {
    const isAllowed = ALLOWED_BASE_DIRS.some(baseDir => 
      resolvedPath.startsWith(path.resolve(baseDir))
    );
    
    if (!isAllowed) {
      throw new Error('Path is outside allowed directories');
    }
  }
  
  return resolvedPath;
}

/**
 * Check if file extension is allowed
 */
function isAllowedExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Get file stats
 */
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      name: path.basename(filePath),
      ext: path.extname(filePath).toLowerCase(),
      size: stats.size,
      mtime: stats.mtime,
      pathB64: encodePath(filePath)
    };
  } catch (err) {
    return null;
  }
}

// API Routes

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/**
 * Load directory and return list of images
 */
app.post('/api/load-directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }
    
    // Validate directory exists
    let stats;
    try {
      stats = await fs.stat(dirPath);
    } catch (err) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    
    // Validate path is allowed
    try {
      await validatePath(dirPath);
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }
    
    // Read directory
    const files = await fs.readdir(dirPath);
    
    // Filter and get stats for images
    const imagePromises = files
      .map(file => path.join(dirPath, file))
      .filter(filePath => isAllowedExtension(filePath))
      .map(filePath => getFileStats(filePath));
    
    const imageStats = await Promise.all(imagePromises);
    const images = imageStats.filter(img => img !== null);
    
    res.json({
      dir: dirPath,
      images,
      count: images.length
    });
    
  } catch (err) {
    console.error('Error loading directory:', err);
    res.status(500).json({ error: 'Failed to load directory', message: err.message });
  }
});

/**
 * Serve an image file
 */
app.get('/api/image', async (req, res) => {
  try {
    const { path: encodedPath } = req.query;
    
    if (!encodedPath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    // Decode path
    let filePath;
    try {
      filePath = decodePath(encodedPath);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid path encoding' });
    }
    
    // Validate extension
    if (!isAllowedExtension(filePath)) {
      return res.status(415).json({ error: 'Unsupported file type' });
    }
    
    // Validate path
    try {
      await validatePath(filePath);
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }
    
    // Check file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Set headers to prevent caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Send file with correct content type
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    res.type(mimeType);
    res.sendFile(path.resolve(filePath));
    
  } catch (err) {
    console.error('Error serving image:', err);
    res.status(500).json({ error: 'Failed to serve image', message: err.message });
  }
});

/**
 * Delete an image file
 */
app.delete('/api/delete-image', async (req, res) => {
  try {
    const { path: encodedPath } = req.body;
    
    if (!encodedPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    // Decode path
    let filePath;
    try {
      filePath = decodePath(encodedPath);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid path encoding' });
    }
    
    // Validate extension
    if (!isAllowedExtension(filePath)) {
      return res.status(415).json({ error: 'Unsupported file type' });
    }
    
    // Validate path
    try {
      await validatePath(filePath);
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }
    
    // Delete file directly (skip existence check for speed)
    await fs.unlink(filePath);
    
    res.json({ ok: true, pathB64: encodedPath });
    
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image', message: err.message });
  }
});

/**
 * Bulk delete images
 */
app.post('/api/delete-images-bulk', async (req, res) => {
  try {
    const { paths } = req.body;
    
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'Paths array is required' });
    }
    
    // Process all deletions
    const results = await Promise.allSettled(
      paths.map(async (encodedPath) => {
        try {
          const filePath = decodePath(encodedPath);
          
          // Validate extension and path
          if (!isAllowedExtension(filePath)) {
            throw new Error('Unsupported file type');
          }
          
          await validatePath(filePath);
          await fs.unlink(filePath);
          
          return { pathB64: encodedPath, success: true };
        } catch (err) {
          return { pathB64: encodedPath, success: false, error: err.message };
        }
      })
    );
    
    const succeeded = [];
    const failed = [];
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          succeeded.push(result.value.pathB64);
        } else {
          failed.push(result.value);
        }
      } else {
        failed.push({ error: result.reason.message });
      }
    });
    
    res.json({
      ok: true,
      succeeded,
      failed,
      total: paths.length,
      successCount: succeeded.length,
      failedCount: failed.length
    });
    
  } catch (err) {
    console.error('Error in bulk delete:', err);
    res.status(500).json({ error: 'Failed to delete images', message: err.message });
  }
});

/**
 * List directories for browsing
 */
app.get('/api/list-directory', async (req, res) => {
  try {
    let dirPath = req.query.path ? decodePath(req.query.path) : '/';
    
    // Default to user home if root and ALLOWED_BASE_DIRS is set
    if (dirPath === '/' && ALLOWED_BASE_DIRS && ALLOWED_BASE_DIRS.length > 0) {
      dirPath = ALLOWED_BASE_DIRS[0];
    }
    
    // Validate directory exists
    let stats;
    try {
      stats = await fs.stat(dirPath);
    } catch (err) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
    
    // Validate path is allowed
    try {
      await validatePath(dirPath);
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }
    
    // Read directory
    const files = await fs.readdir(dirPath);
    
    // Get directories and count images
    const entries = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(dirPath, file);
        try {
          const stat = await fs.stat(fullPath);
          return { name: file, fullPath, isDir: stat.isDirectory() };
        } catch (err) {
          return null;
        }
      })
    );
    
    const dirs = entries
      .filter(entry => entry && entry.isDir)
      .map(entry => ({
        name: entry.name,
        pathB64: encodePath(entry.fullPath)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const imageCount = entries.filter(entry => 
      entry && !entry.isDir && isAllowedExtension(entry.fullPath)
    ).length;
    
    // Get parent directory
    const parent = path.dirname(dirPath);
    const parentB64 = parent !== dirPath ? encodePath(parent) : null;
    
    res.json({
      path: dirPath,
      pathB64: encodePath(dirPath),
      parent: parentB64,
      dirs,
      imageCount
    });
    
  } catch (err) {
    console.error('Error listing directory:', err);
    res.status(500).json({ error: 'Failed to list directory', message: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Image Gallery server running on port ${PORT}`);
  console.log(`Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  if (ALLOWED_BASE_DIRS) {
    console.log(`Allowed base directories: ${ALLOWED_BASE_DIRS.join(', ')}`);
  } else {
    console.log('No directory restrictions (all paths allowed)');
  }
});
