/**
 * Gallery Class
 * Manages the image grid, selection, and deletion
 */
class Gallery {
  constructor() {
    this.images = [];
    this.selected = new Set();
    this.currentDir = null;
    this.lastClickedIndex = -1;
    this.computedColumns = 0;
    
    this.gridEl = document.getElementById('gallery');
    this.imageCountEl = document.getElementById('imageCount');
    
    // Selection controls
    this.selectAllBtn = document.getElementById('selectAllBtn');
    this.deselectAllBtn = document.getElementById('deselectAllBtn');
    this.selectRowBtn = document.getElementById('selectRowBtn');
    this.selectColumnBtn = document.getElementById('selectColumnBtn');
    this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    
    this.bindEvents();
    this.computeColumns();
    
    // Register with global app state
    if (window.appState) {
      window.appState.gallery = this;
    }
  }

  /**
   * Bind events
   */
  bindEvents() {
    this.selectAllBtn.addEventListener('click', () => this.selectAll());
    this.deselectAllBtn.addEventListener('click', () => this.deselectAll());
    this.selectRowBtn.addEventListener('click', () => this.selectRow());
    this.selectColumnBtn.addEventListener('click', () => this.selectColumn());
    this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelected());
    
    // Recompute columns on resize
    window.addEventListener('resize', () => this.computeColumns());
  }

  /**
   * Compute number of columns in grid
   */
  computeColumns() {
    if (this.images.length === 0) {
      this.computedColumns = 0;
      return;
    }
    
    const gridStyle = window.getComputedStyle(this.gridEl);
    const templateColumns = gridStyle.gridTemplateColumns;
    
    if (templateColumns && templateColumns !== 'none') {
      this.computedColumns = templateColumns.split(' ').length;
    } else {
      this.computedColumns = 1;
    }
  }

  /**
   * Load directory and display images
   */
  async loadDirectory(dirPath) {
    try {
      const data = await window.appState.apiClient.loadDirectory(dirPath);
      
      this.currentDir = data.dir;
      this.images = data.images;
      this.selected.clear();
      this.lastClickedIndex = -1;
      
      this.renderGrid();
      this.updateImageCount();
      this.computeColumns();
      
    } catch (error) {
      console.error('Failed to load directory:', error);
      alert('Failed to load directory: ' + error.message);
    }
  }

  /**
   * Render gallery grid
   */
  renderGrid() {
    this.gridEl.innerHTML = '';
    
    if (this.images.length === 0) {
      this.gridEl.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1; padding: 2rem;">No images found in directory</p>';
      return;
    }
    
    this.images.forEach((image, index) => {
      const tile = this.createImageTile(image, index);
      this.gridEl.appendChild(tile);
    });
  }

  /**
   * Create image tile element
   */
  createImageTile(image, index) {
    const tile = document.createElement('div');
    tile.className = 'image-tile';
    tile.dataset.index = index;
    tile.dataset.pathB64 = image.pathB64;
    
    // Image
    const img = document.createElement('img');
    img.src = window.appState.apiClient.getImageUrl(image.pathB64);
    img.alt = image.name;
    img.loading = 'lazy';
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'image-tile-checkbox';
    checkbox.checked = this.selected.has(image.pathB64);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'image-tile-delete';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.title = 'Delete image';
    
    // Filename overlay
    const nameOverlay = document.createElement('div');
    nameOverlay.className = 'image-tile-name';
    nameOverlay.textContent = image.name;
    
    // Event handlers
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSlideshow(index);
    });
    
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSelection(index);
    });
    
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.deleteSingleImage(index);
    });
    
    // Mark as selected if in set
    if (this.selected.has(image.pathB64)) {
      tile.classList.add('selected');
    }
    
    tile.appendChild(img);
    tile.appendChild(checkbox);
    tile.appendChild(deleteBtn);
    tile.appendChild(nameOverlay);
    
    return tile;
  }

  /**
   * Update image count display
   */
  updateImageCount() {
    const selectedCount = this.selected.size;
    if (this.images.length === 0) {
      this.imageCountEl.textContent = 'No images loaded';
    } else if (selectedCount > 0) {
      this.imageCountEl.textContent = `${this.images.length} images (${selectedCount} selected)`;
    } else {
      this.imageCountEl.textContent = `${this.images.length} images`;
    }
  }

  /**
   * Toggle selection for image at index
   */
  toggleSelection(index) {
    const image = this.images[index];
    if (!image) return;
    
    if (this.selected.has(image.pathB64)) {
      this.selected.delete(image.pathB64);
    } else {
      this.selected.add(image.pathB64);
    }
    
    this.lastClickedIndex = index;
    this.updateImageCount();
    this.updateTileSelection(index);
  }

  /**
   * Update tile selection visual state
   */
  updateTileSelection(index) {
    const tile = this.gridEl.querySelector(`[data-index="${index}"]`);
    if (!tile) return;
    
    const image = this.images[index];
    const checkbox = tile.querySelector('.image-tile-checkbox');
    
    if (this.selected.has(image.pathB64)) {
      tile.classList.add('selected');
      checkbox.checked = true;
    } else {
      tile.classList.remove('selected');
      checkbox.checked = false;
    }
  }

  /**
   * Select all images
   */
  selectAll() {
    this.selected.clear();
    this.images.forEach(img => this.selected.add(img.pathB64));
    this.updateImageCount();
    this.renderGrid();
  }

  /**
   * Deselect all images
   */
  deselectAll() {
    this.selected.clear();
    this.updateImageCount();
    this.renderGrid();
  }

  /**
   * Select row containing last clicked image
   */
  selectRow() {
    if (this.lastClickedIndex < 0 || this.computedColumns === 0) return;
    
    const row = Math.floor(this.lastClickedIndex / this.computedColumns);
    const startIndex = row * this.computedColumns;
    const endIndex = Math.min(startIndex + this.computedColumns, this.images.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      this.selected.add(this.images[i].pathB64);
    }
    
    this.updateImageCount();
    this.renderGrid();
  }

  /**
   * Select column containing last clicked image
   */
  selectColumn() {
    if (this.lastClickedIndex < 0 || this.computedColumns === 0) return;
    
    const column = this.lastClickedIndex % this.computedColumns;
    
    for (let i = column; i < this.images.length; i += this.computedColumns) {
      this.selected.add(this.images[i].pathB64);
    }
    
    this.updateImageCount();
    this.renderGrid();
  }

  /**
   * Delete single image
   */
  async deleteSingleImage(index) {
    const image = this.images[index];
    if (!image) return;
    
    try {
      await window.appState.apiClient.deleteImage(image.pathB64);
      
      // Remove from array and selection
      this.images.splice(index, 1);
      this.selected.delete(image.pathB64);
      
      // Update display
      this.renderGrid();
      this.updateImageCount();
      this.computeColumns();
      
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image: ' + error.message);
    }
  }

  /**
   * Delete selected images
   */
  async deleteSelected() {
    if (this.selected.size === 0) return;
    
    const toDelete = Array.from(this.selected);
    
    // Delete all concurrently
    const results = await Promise.allSettled(
      toDelete.map(pathB64 => window.appState.apiClient.deleteImage(pathB64))
    );
    
    // Track which deletions succeeded
    const succeeded = new Set();
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        succeeded.add(toDelete[i]);
      } else {
        console.error('Failed to delete image:', toDelete[i], result.reason);
      }
    });
    
    // Remove successfully deleted images
    this.images = this.images.filter(img => !succeeded.has(img.pathB64));
    
    // Update selection (keep failed deletions selected)
    this.selected = new Set(
      Array.from(this.selected).filter(pathB64 => !succeeded.has(pathB64))
    );
    
    // Update display
    this.renderGrid();
    this.updateImageCount();
    this.computeColumns();
    
    // Show summary if there were failures
    const failedCount = toDelete.length - succeeded.size;
    if (failedCount > 0) {
      alert(`Deleted ${succeeded.size} images. Failed to delete ${failedCount} images.`);
    }
  }

  /**
   * Handle external deletion (from slideshow)
   */
  onExternalDeletion(pathB64) {
    const index = this.images.findIndex(img => img.pathB64 === pathB64);
    if (index >= 0) {
      this.images.splice(index, 1);
      this.selected.delete(pathB64);
      this.renderGrid();
      this.updateImageCount();
      this.computeColumns();
    }
  }

  /**
   * Open slideshow at specific index
   */
  openSlideshow(startIndex) {
    if (window.appState.slideshow) {
      window.appState.slideshow.show(this.images, startIndex);
    }
  }
}

// Initialize gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Gallery();
});
