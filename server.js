'use strict'

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs').promises

const PORT = process.env.PORT || 3000
const APP_ROOT = __dirname
const DEFAULT_DIR = '/Volumes' // Start at /Volumes to access all mounted drives
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])

// Validate and sanitize directory path
function validateDirectory(dir) {
  if (!dir) return null
  const resolved = path.resolve(dir)
  
  // Basic security: prevent path traversal attacks
  // Allow access to all mounted volumes including /Volumes
  if (resolved.includes('..')) return null
  
  // Check if directory exists and is readable
  try {
    const stat = require('fs').statSync(resolved)
    if (!stat.isDirectory()) return null
    return resolved
  } catch (err) {
    return null
  }
}

/**
 * ImageService class handles all file operations for images
 * Provides secure methods to list, validate, and delete images
 */
class ImageService {
  /**
   * List all allowed image files from directory sorted by modification time (newest first)
   * @param {string} dir - Directory path
   * @returns {Promise<string[]>} Array of image filenames
   */
  static async listImages(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const out = []
    
    for (const entry of entries) {
      if (!entry.isFile()) continue
      
      const ext = path.extname(entry.name).toLowerCase()
      if (!ALLOWED_EXT.has(ext)) continue
      
      const stat = await fs.stat(path.join(dir, entry.name))
      out.push({ name: entry.name, mtimeMs: stat.mtimeMs })
    }
    
    // Sort by modification time, newest first
    out.sort((a, b) => b.mtimeMs - a.mtimeMs)
    return out.map(x => x.name)
  }

  /**
   * Validate filename to prevent path traversal and ensure allowed extension
   * @param {string} name - Filename to validate
   * @returns {boolean} True if filename is safe and allowed
   */
  static isAllowedFilename(name) {
    if (!name || name.includes('/') || name.includes('\\')) return false
    const ext = path.extname(name).toLowerCase()
    return ALLOWED_EXT.has(ext)
  }

  /**
   * Delete an image file after validation
   * @param {string} dir - Directory path  
   * @param {string} name - Filename to delete
   * @throws {Error} If filename is invalid
   */
  static async delete(dir, name) {
    if (!this.isAllowedFilename(name)) {
      throw new Error('Invalid filename')
    }
    await fs.unlink(path.join(dir, name))
  }
}

// Initialize Express app
const app = express()

// Middleware
app.use(cors())
app.use(morgan('dev'))
app.use(express.static(path.join(APP_ROOT, 'public'), { maxAge: '1h' }))

/**
 * GET /api/directories
 * Returns subdirectories of given path
 */
app.get('/api/directories', async (req, res) => {
  try {
    const dir = req.query.dir || DEFAULT_DIR
    const validated = validateDirectory(dir)
    if (!validated) return res.status(400).json({ error: 'Invalid directory' })
    
    const entries = await fs.readdir(validated, { withFileTypes: true })
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(validated, e.name)
      }))
    
    res.json({ currentDir: validated, directories: dirs })
  } catch (err) {
    console.error('Error listing directories:', err)
    res.status(500).json({ error: 'Failed to list directories' })
  }
})

/**
 * GET /api/images?dir=/path/to/dir
 * Returns a JSON array of all image files with their URLs from specified directory
 */
app.get('/api/images', async (req, res) => {
  try {
    const dir = req.query.dir || DEFAULT_DIR
    const validated = validateDirectory(dir)
    if (!validated) return res.status(400).json({ error: 'Invalid directory' })
    
    const names = await ImageService.listImages(validated)
    res.json({
      directory: validated,
      files: names.map(n => ({
        name: n,
        url: '/images/' + encodeURIComponent(n) + '?dir=' + encodeURIComponent(validated)
      }))
    })
  } catch (err) {
    console.error('Error listing images:', err)
    res.status(500).json({ error: 'Failed to list images' })
  }
})

/**
 * GET /images/:filename?dir=/path/to/dir
 * Serves individual image files
 */
app.get('/images/:filename', (req, res) => {
  const name = req.params.filename
  const dir = req.query.dir || DEFAULT_DIR
  const validated = validateDirectory(dir)
  
  if (!validated || !ImageService.isAllowedFilename(name)) {
    return res.status(400).json({ error: 'Invalid filename or directory' })
  }
  
  res.sendFile(path.join(validated, name), (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' })
    }
  })
})

/**
 * DELETE /api/images/:filename?dir=/path/to/dir
 * Deletes an image file (no confirmation required)
 */
app.delete('/api/images/:filename', async (req, res) => {
  try {
    const dir = req.query.dir || DEFAULT_DIR
    const validated = validateDirectory(dir)
    if (!validated) return res.status(400).json({ error: 'Invalid directory' })
    
    await ImageService.delete(validated, req.params.filename)
    res.json({ ok: true })
  } catch (err) {
    console.error('Error deleting file:', err)
    res.status(400).json({ error: 'Delete failed' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Default directory: ${DEFAULT_DIR}`)
  console.log(`Browse directories and select images to view`)
})
