/**
 * Slideshow Class
 * Manages fullscreen slideshow with auto-advance and controls
 */
class Slideshow {
  constructor() {
    this.images = [];
    this.index = 0;
    this.timer = null;
    this.autoStartTimer = null;
    this.paused = false;
    this.speedSec = 2;
    this.keyHandler = null;
    
    // UI Elements
    this.overlayEl = document.getElementById('slideshowOverlay');
    this.imageEl = document.getElementById('slideshowImage');
    this.counterEl = document.getElementById('slideshowCounter');
    this.exitBtn = document.getElementById('slideshowExitBtn');
    this.prevBtn = document.getElementById('slideshowPrevBtn');
    this.nextBtn = document.getElementById('slideshowNextBtn');
    this.deleteBtn = document.getElementById('slideshowDeleteBtn');
    this.pausePlayBtn = document.getElementById('slideshowPausePlayBtn');
    this.speedSlider = document.getElementById('slideshowSpeedSlider');
    this.speedDecBtn = document.getElementById('slideshowSpeedDecBtn');
    this.speedIncBtn = document.getElementById('slideshowSpeedIncBtn');
    this.speedDisplay = document.getElementById('slideshowSpeedDisplay');
    
    this.bindEvents();
    
    // Register with global app state
    if (window.appState) {
      window.appState.slideshow = this;
      
      // Subscribe to global settings
      window.appState.settings.subscribe((settings) => {
        this.paused = settings.paused;
        this.speedSec = settings.speedSec;
        this.updateUI();
        
        // Restart timer if slideshow is active and not paused
        if (this.overlayEl.classList.contains('active') && !this.paused) {
          this.resetTimer();
        }
      });
    }
  }

  /**
   * Bind UI events
   */
  bindEvents() {
    this.exitBtn.addEventListener('click', () => this.exit());
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.deleteBtn.addEventListener('click', () => this.deleteCurrent());
    
    this.pausePlayBtn.addEventListener('click', () => {
      window.appState.settings.togglePause();
    });
    
    this.speedSlider.addEventListener('input', (e) => {
      window.appState.settings.setSpeed(parseInt(e.target.value));
    });
    
    this.speedDecBtn.addEventListener('click', () => {
      window.appState.settings.setSpeed(window.appState.settings.speedSec - 1);
    });
    
    this.speedIncBtn.addEventListener('click', () => {
      window.appState.settings.setSpeed(window.appState.settings.speedSec + 1);
    });
  }

  /**
   * Show slideshow
   */
  show(images, startIndex = 0) {
    if (!images || images.length === 0) return;
    
    this.images = [...images];  // Clone array
    this.index = Math.max(0, Math.min(startIndex, this.images.length - 1));
    
    // Get current settings
    this.paused = window.appState.settings.paused;
    this.speedSec = window.appState.settings.speedSec;
    
    // Show overlay
    this.overlayEl.classList.add('active');
    
    // Setup keyboard handler
    this.setupKeyboardHandler();
    
    // Display current image
    this.displayCurrent();
    this.updateUI();
    
    // Auto-start after 5 seconds
    this.autoStartTimer = setTimeout(() => {
      if (this.overlayEl.classList.contains('active')) {
        window.appState.settings.setPaused(false);
      }
    }, 5000);
  }

  /**
   * Setup keyboard event handler
   */
  setupKeyboardHandler() {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }
    
    this.keyHandler = (e) => {
      if (!this.overlayEl.classList.contains('active')) return;
      
      switch (e.key) {
        case 'Escape':
          this.exit();
          break;
        case 'ArrowLeft':
          this.prev();
          break;
        case 'ArrowRight':
          this.next();
          break;
        case ' ':
          e.preventDefault();
          window.appState.settings.togglePause();
          break;
        case 'Delete':
        case 'x':
        case 'X':
          this.deleteCurrent();
          break;
      }
    };
    
    document.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Display current image
   */
  displayCurrent() {
    if (this.images.length === 0) {
      this.exit();
      return;
    }
    
    const image = this.images[this.index];
    this.imageEl.src = window.appState.apiClient.getImageUrl(image.pathB64);
    this.counterEl.textContent = `${this.index + 1} / ${this.images.length}`;
    
    // Reset timer if not paused
    if (!this.paused) {
      this.resetTimer();
    }
  }

  /**
   * Update UI elements
   */
  updateUI() {
    this.pausePlayBtn.textContent = this.paused ? '▶ Play' : '⏸ Pause';
    this.speedSlider.value = this.speedSec;
    this.speedDisplay.textContent = `${this.speedSec}s`;
  }

  /**
   * Reset auto-advance timer
   */
  resetTimer() {
    this.clearTimer();
    
    if (!this.paused && this.images.length > 1) {
      this.timer = setTimeout(() => {
        this.next();
      }, this.speedSec * 1000);
    }
  }

  /**
   * Clear timer
   */
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Navigate to previous image
   */
  prev() {
    this.index = (this.index - 1 + this.images.length) % this.images.length;
    this.displayCurrent();
  }

  /**
   * Navigate to next image
   */
  next() {
    this.index = (this.index + 1) % this.images.length;
    this.displayCurrent();
  }

  /**
   * Delete current image
   */
  async deleteCurrent() {
    if (this.images.length === 0) return;
    
    const image = this.images[this.index];
    const currentIndex = this.index;
    
    try {
      // Delete from server
      await window.appState.apiClient.deleteImage(image.pathB64);
      
      // Remove from images array
      this.images.splice(currentIndex, 1);
      
      // Notify gallery
      if (window.appState.gallery) {
        window.appState.gallery.onExternalDeletion(image.pathB64);
      }
      
      // If no images left, exit
      if (this.images.length === 0) {
        this.exit();
        return;
      }
      
      // Adjust index if needed
      if (this.index >= this.images.length) {
        this.index = 0;
      }
      
      // Display next image
      this.displayCurrent();
      
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image: ' + error.message);
    }
  }

  /**
   * Exit slideshow
   */
  exit() {
    // Clear timers
    this.clearTimer();
    if (this.autoStartTimer) {
      clearTimeout(this.autoStartTimer);
      this.autoStartTimer = null;
    }
    
    // Remove keyboard handler
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    
    // Hide overlay
    this.overlayEl.classList.remove('active');
    
    // Reset state
    this.images = [];
    this.index = 0;
  }
}

// Initialize slideshow when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Slideshow();
});
