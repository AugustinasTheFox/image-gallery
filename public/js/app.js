/**
 * API Client for backend communication
 */
class ApiClient {
  /**
   * List directory contents
   */
  async listDirectory(pathB64) {
    const url = pathB64 
      ? `/api/list-directory?path=${encodeURIComponent(pathB64)}`
      : '/api/list-directory';
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list directory');
    }
    return response.json();
  }

  /**
   * Load images from directory
   */
  async loadDirectory(path) {
    const response = await fetch('/api/load-directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load directory');
    }
    return response.json();
  }

  /**
   * Get image URL from encoded path
   */
  getImageUrl(pathB64) {
    return `/api/image?path=${encodeURIComponent(pathB64)}`;
  }

  /**
   * Delete image
   */
  async deleteImage(pathB64) {
    const response = await fetch('/api/delete-image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathB64 })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete image');
    }
    return response.json();
  }

  /**
   * Bulk delete images
   */
  async deleteImagesBulk(pathsB64) {
    const response = await fetch('/api/delete-images-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: pathsB64 })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete images');
    }
    return response.json();
  }
}

/**
 * Global Settings Store
 * Manages slideshow settings and syncs across components
 */
class Settings {
  constructor() {
    // Load from localStorage or use defaults
    this.paused = localStorage.getItem('slideshow_paused') === 'true' || false;
    this.speedSec = parseInt(localStorage.getItem('slideshow_speed')) || 2;
    
    this.listeners = [];
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners of changes
   */
  notify() {
    this.listeners.forEach(callback => callback(this));
  }

  /**
   * Set paused state
   */
  setPaused(paused) {
    this.paused = paused;
    localStorage.setItem('slideshow_paused', paused);
    this.notify();
  }

  /**
   * Set speed
   */
  setSpeed(speedSec) {
    this.speedSec = Math.max(1, Math.min(25, speedSec));
    localStorage.setItem('slideshow_speed', this.speedSec);
    this.notify();
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    this.setPaused(!this.paused);
  }
}

/**
 * Directory Browser Modal
 * Handles server-side directory browsing
 */
class DirectoryBrowser {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.currentPath = null;
    this.currentPathB64 = null;
    
    this.modal = document.getElementById('browserModal');
    this.currentPathEl = document.getElementById('browserCurrentPath');
    this.dirListEl = document.getElementById('browserDirList');
    this.upBtn = document.getElementById('browserUpBtn');
    this.useBtn = document.getElementById('browserUseBtn');
    this.cancelBtn = document.getElementById('browserCancelBtn');
    this.closeBtn = document.getElementById('modalCloseBtn');
    
    this.onSelectCallback = null;
    
    this.bindEvents();
  }

  /**
   * Bind modal events
   */
  bindEvents() {
    this.upBtn.addEventListener('click', () => this.navigateUp());
    this.useBtn.addEventListener('click', () => this.selectCurrent());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('click', () => this.close());
    
    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.modal.classList.contains('active')) return;
      
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  /**
   * Open browser modal
   */
  async open(onSelect) {
    this.onSelectCallback = onSelect;
    this.modal.classList.add('active');
    
    // Start at root or first allowed directory
    await this.loadDirectory();
  }

  /**
   * Close modal
   */
  close() {
    this.modal.classList.remove('active');
    this.onSelectCallback = null;
  }

  /**
   * Load directory contents
   */
  async loadDirectory(pathB64 = null) {
    try {
      const data = await this.apiClient.listDirectory(pathB64);
      
      this.currentPath = data.path;
      this.currentPathB64 = data.pathB64;
      this.currentPathEl.textContent = this.currentPath;
      
      // Enable/disable up button
      this.upBtn.disabled = !data.parent;
      
      // Render directories
      this.dirListEl.innerHTML = '';
      
      if (data.dirs.length === 0) {
        this.dirListEl.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No subdirectories</p>';
      } else {
        data.dirs.forEach(dir => {
          const item = document.createElement('div');
          item.className = 'dir-item';
          item.textContent = dir.name;
          item.addEventListener('click', () => this.loadDirectory(dir.pathB64));
          this.dirListEl.appendChild(item);
        });
      }
      
      // Show image count
      if (data.imageCount > 0) {
        const info = document.createElement('p');
        info.style.color = 'var(--text-secondary)';
        info.style.textAlign = 'center';
        info.style.marginTop = '1rem';
        info.textContent = `${data.imageCount} image(s) in this directory`;
        this.dirListEl.appendChild(info);
      }
      
    } catch (error) {
      console.error('Failed to load directory:', error);
      alert('Failed to load directory: ' + error.message);
    }
  }

  /**
   * Navigate to parent directory
   */
  async navigateUp() {
    try {
      const data = await this.apiClient.listDirectory(this.currentPathB64);
      if (data.parent) {
        await this.loadDirectory(data.parent);
      }
    } catch (error) {
      console.error('Failed to navigate up:', error);
    }
  }

  /**
   * Select current directory
   */
  selectCurrent() {
    if (this.onSelectCallback && this.currentPath) {
      this.onSelectCallback(this.currentPath);
    }
    this.close();
  }
}

/**
 * App Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize core objects
  const apiClient = new ApiClient();
  const settings = new Settings();
  const browser = new DirectoryBrowser(apiClient);
  
  // Make available globally for Gallery and Slideshow
  window.appState = {
    apiClient,
    settings,
    browser,
    gallery: null,  // Will be set by Gallery class
    slideshow: null  // Will be set by Slideshow class
  };
  
  // UI Elements
  const dirPathInput = document.getElementById('dirPathInput');
  const browseBtn = document.getElementById('browseBtn');
  const loadBtn = document.getElementById('loadBtn');
  const pausePlayBtn = document.getElementById('pausePlayBtn');
  const speedSlider = document.getElementById('speedSlider');
  const speedDecBtn = document.getElementById('speedDecBtn');
  const speedIncBtn = document.getElementById('speedIncBtn');
  const speedDisplay = document.getElementById('speedDisplay');
  
  // Initialize UI from settings
  updatePausePlayButton();
  speedSlider.value = settings.speedSec;
  speedDisplay.textContent = `${settings.speedSec}s`;
  
  /**
   * Update pause/play button text
   */
  function updatePausePlayButton() {
    pausePlayBtn.textContent = settings.paused ? '▶ Play' : '⏸ Pause';
  }
  
  /**
   * Update speed display
   */
  function updateSpeedDisplay() {
    speedDisplay.textContent = `${settings.speedSec}s`;
  }
  
  // Subscribe to settings changes
  settings.subscribe(() => {
    updatePausePlayButton();
    updateSpeedDisplay();
    speedSlider.value = settings.speedSec;
  });
  
  // Browse button
  browseBtn.addEventListener('click', () => {
    browser.open((path) => {
      dirPathInput.value = path;
    });
  });
  
  // Load button
  loadBtn.addEventListener('click', async () => {
    const path = dirPathInput.value.trim();
    if (!path) {
      alert('Please enter a directory path');
      return;
    }
    
    if (window.appState.gallery) {
      await window.appState.gallery.loadDirectory(path);
    }
  });
  
  // Enter key in path input
  dirPathInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadBtn.click();
    }
  });
  
  // Pause/Play button
  pausePlayBtn.addEventListener('click', () => {
    settings.togglePause();
  });
  
  // Speed controls
  speedSlider.addEventListener('input', (e) => {
    settings.setSpeed(parseInt(e.target.value));
  });
  
  speedDecBtn.addEventListener('click', () => {
    settings.setSpeed(settings.speedSec - 1);
  });
  
  speedIncBtn.addEventListener('click', () => {
    settings.setSpeed(settings.speedSec + 1);
  });
  
  // Gallery and Slideshow will initialize themselves
  // and register with window.appState
});
