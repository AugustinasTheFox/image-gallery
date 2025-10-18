import PhotoSwipeLightbox from 'https://unpkg.com/photoswipe@5/dist/photoswipe-lightbox.esm.min.js'

let lightbox = null
let slideshow = null
let files = []
let currentDir = null
let shouldAutoPlayOnInit = true

// Slideshow controller
function initSlideshow() {
  const playBtn = document.getElementById('play')
  const intervalInput = document.getElementById('interval')
  const intervalLabel = document.getElementById('intervalLabel')
  
  let timer = null
  let intervalMs = 3000
  
  function updateLabel() {
    intervalLabel.textContent = (intervalMs / 1000).toFixed(1) + 's'
  }
  
  function play() {
    if (!lightbox?.pswp) return
    timer = setInterval(() => {
      if (lightbox?.pswp) lightbox.pswp.next()
    }, intervalMs)
    playBtn.textContent = 'Pause'
  }
  
  function pause() {
    if (timer) clearInterval(timer)
    timer = null
    playBtn.textContent = 'Play'
  }
  
  function isPlaying() {
    return timer !== null
  }
  
  playBtn.addEventListener('click', () => {
    timer ? pause() : play()
  })
  
  intervalInput.addEventListener('input', () => {
    intervalMs = parseFloat(intervalInput.value) * 1000
    updateLabel()
    if (timer) {
      pause()
      play()
    }
  })
  
  updateLabel()
  
  return { play, pause, isPlaying, get timer() { return timer } }
}

// Load images from API
async function loadImages(dir) {
  try {
    const url = dir ? `/api/images?dir=${encodeURIComponent(dir)}` : '/api/images'
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to load')
    const data = await res.json()
    currentDir = data.directory || dir
    files = data.files || []
    render()
  } catch (err) {
    console.error(err)
    document.getElementById('grid').innerHTML = '<p style="text-align: center; color: #a0a0a0; padding: 2rem;">Failed to load images</p>'
  }
}

// Render grid
function render() {
  const grid = document.getElementById('grid')
  grid.innerHTML = ''
  
  if (files.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: #a0a0a0; padding: 2rem;">No images found</p>'
    return
  }
  
  files.forEach(file => {
    const a = document.createElement('a')
    a.href = file.url
    a.className = 'tile'
    a.setAttribute('data-pswp-width', '1920')
    a.setAttribute('data-pswp-height', '1080')
    
    const img = document.createElement('img')
    img.src = file.url
    img.alt = file.name
    
    img.onload = () => {
      a.setAttribute('data-pswp-width', img.naturalWidth)
      a.setAttribute('data-pswp-height', img.naturalHeight)
    }
    
    const del = document.createElement('button')
    del.className = 'delete'
    del.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      deleteImage(file.name, a)
    }
    
    a.append(img, del)
    grid.appendChild(a)
  })
}

// Delete image
async function deleteImage(name, elem) {
  try {
    const url = currentDir 
      ? `/api/images/${encodeURIComponent(name)}?dir=${encodeURIComponent(currentDir)}`
      : `/api/images/${encodeURIComponent(name)}`
    const res = await fetch(url, { method: 'DELETE' })
    if (res.ok) {
      console.log('Image deleted successfully:', name)
      // Update files array
      files = files.filter(f => f.name !== name)
      
      if (elem) {
        elem.style.opacity = '0'
        setTimeout(() => elem.remove(), 300)
      }
      return true
    }
    return false
  } catch (err) {
    console.error('Delete failed:', err)
    return false
  }
}

// Apply current fit mode to images
function applyFitMode() {
  const mode = document.body.getAttribute('data-fit-mode') || 'contain'
  
  // Force PhotoSwipe to recalculate
  if (lightbox?.pswp) {
    // Reset zoom
    lightbox.pswp.currSlide.zoomLevels.initial = 1
    lightbox.pswp.currSlide.zoomLevels.secondary = 1
    
    // Trigger update
    lightbox.pswp.updateSize(true)
    
    // Center the image
    setTimeout(() => {
      const img = document.querySelector('.pswp__img')
      if (img) {
        img.style.position = 'relative'
        img.style.top = 'auto'
        img.style.left = 'auto'
        img.style.transform = 'none'
      }
    }, 50)
  }
}

// Force center image positioning
function forceCenterImage() {
  const zoomWraps = document.querySelectorAll('.pswp__zoom-wrap')
  const images = document.querySelectorAll('.pswp__img')
  
  zoomWraps.forEach(wrap => {
    wrap.style.cssText = 'display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important;'
  })
  
  images.forEach(img => {
    img.style.position = 'relative'
    img.style.top = '0'
    img.style.left = '0'
    img.style.transform = 'none'
    img.style.margin = 'auto'
  })
}

// Initialize PhotoSwipe
function initLightbox() {
  lightbox = new PhotoSwipeLightbox({
    gallery: '#grid',
    children: 'a.tile',
    pswpModule: () => import('https://unpkg.com/photoswipe@5/dist/photoswipe.esm.min.js'),
    // Disable zoom and pan to prevent positioning issues
    allowPanToNext: false,
    zoom: false,
    pinchToClose: false,
    closeOnVerticalDrag: false
  })
  
  // Add custom buttons to PhotoSwipe UI
  lightbox.on('uiRegister', function() {
    console.log('PhotoSwipe UI registering custom buttons')
    
    // Add Play/Pause button
    lightbox.pswp.ui.registerElement({
      name: 'play-pause-button',
      ariaLabel: 'Play/Pause slideshow',
      order: 9,
      isButton: true,
      html: '▶️',
      appendTo: 'bar',
      onClick: (event, el) => {
        console.log('Registered Play/Pause button clicked')
        if (slideshow.isPlaying()) {
          slideshow.pause()
          el.innerHTML = '▶️'
        } else {
          slideshow.play()
          el.innerHTML = '⏸️'
        }
      }
    })
    console.log('Play/Pause button registered')
    
    // Add Delete button
    lightbox.pswp.ui.registerElement({
      name: 'delete-button',
      ariaLabel: 'Delete image',
      order: 10,
      isButton: true,
      html: '🗑️',
      appendTo: 'bar',
      onClick: async (event, el) => {
        const currentSlide = lightbox.pswp.currSlide
        const currentIndex = lightbox.pswp.currIndex
        const imageUrl = currentSlide.data.src
        
        // Extract filename from URL
        const urlParts = imageUrl.split('/')
        const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0])
        
        console.log('Deleting:', filename)
        
        // Delete the file
        const deleted = await deleteImage(filename, null)
        
        if (deleted) {
          // Remember slideshow state
          const wasPlaying = slideshow.isPlaying()
          
          // Close lightbox, re-render grid, and reinitialize lightbox
          lightbox.pswp.close()
          
          setTimeout(() => {
            render()
            
            // Reinitialize lightbox
            if (lightbox) {
              lightbox.destroy()
            }
            initLightbox()
            
            // Reopen at the same or next position if there are still images
            if (files.length > 0) {
              // Set flag to control auto-play
              shouldAutoPlayOnInit = wasPlaying
              
              setTimeout(() => {
                const newIndex = Math.min(currentIndex, files.length - 1)
                lightbox.loadAndOpen(newIndex)
                
                // Update play button state
                setTimeout(() => {
                  const playBtn = document.querySelector('.pswp__button--play-pause-button')
                  if (playBtn) {
                    playBtn.innerHTML = wasPlaying ? '⏸️' : '▶️'
                  }
                }, 100)
              }, 300)
            }
          }, 100)
        }
      }
    })
    console.log('Delete button registered')
  })
  
  lightbox.on('afterInit', () => {
    // Auto-play only if flag is set
    if (shouldAutoPlayOnInit) {
      slideshow.play()
    }
    // Reset flag for next time
    shouldAutoPlayOnInit = true
    
    // Manually add buttons to toolbar if they don't exist
    setTimeout(() => {
      const toolbar = document.querySelector('.pswp__top-bar')
      if (toolbar && !document.querySelector('.pswp__button--play-pause-button')) {
        console.log('Manually adding buttons to toolbar')
        
        // Create play/pause button
        const playPauseBtn = document.createElement('button')
        playPauseBtn.className = 'pswp__button pswp__button--play-pause-button'
        playPauseBtn.innerHTML = '⏸️'
        playPauseBtn.setAttribute('title', 'Play/Pause slideshow (Space)')
        playPauseBtn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('Play/Pause button clicked, isPlaying:', slideshow.isPlaying())
          if (slideshow.isPlaying()) {
            slideshow.pause()
            playPauseBtn.innerHTML = '▶️'
          } else {
            slideshow.play()
            playPauseBtn.innerHTML = '⏸️'
          }
        }
        
        // Create delete button
        const deleteBtn = document.createElement('button')
        deleteBtn.className = 'pswp__button pswp__button--delete-button'
        deleteBtn.innerHTML = '🗑️'
        deleteBtn.setAttribute('title', 'Delete image (Delete key)')
        deleteBtn.onclick = async (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('Delete button clicked!')
          
          const currentSlide = lightbox.pswp.currSlide
          const currentIndex = lightbox.pswp.currIndex
          const imageUrl = currentSlide.data.src
          const urlParts = imageUrl.split('/')
          const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0])
          
          console.log('Deleting:', filename)
          
          const deleted = await deleteImage(filename, null)
          if (deleted) {
            // Remember slideshow state
            const wasPlaying = slideshow.isPlaying()
            
            // Close lightbox, re-render grid, and reinitialize lightbox
            lightbox.pswp.close()
            
            setTimeout(() => {
              render()
              
              // Reinitialize lightbox
              if (lightbox) {
                lightbox.destroy()
              }
              initLightbox()
              
              // Reopen at the same or next position if there are still images
              if (files.length > 0) {
                // Set flag to control auto-play
                shouldAutoPlayOnInit = wasPlaying
                
                setTimeout(() => {
                  const newIndex = Math.min(currentIndex, files.length - 1)
                  lightbox.loadAndOpen(newIndex)
                  
                  // Update play button state
                  setTimeout(() => {
                    const playBtn = document.querySelector('.pswp__button--play-pause-button')
                    if (playBtn) {
                      playBtn.innerHTML = wasPlaying ? '⏸️' : '▶️'
                    }
                  }, 100)
                }, 300)
              }
            }, 100)
          }
        }
        
        // Insert before close button
        const closeBtn = toolbar.querySelector('.pswp__button--close')
        if (closeBtn) {
          toolbar.insertBefore(deleteBtn, closeBtn)
          toolbar.insertBefore(playPauseBtn, deleteBtn)
        } else {
          toolbar.appendChild(playPauseBtn)
          toolbar.appendChild(deleteBtn)
        }
        
        console.log('Buttons manually added')
      }
    }, 100)
    
    // Update play button state
    const playBtn = document.querySelector('.pswp__button--play-pause-button')
    if (playBtn) playBtn.innerHTML = '⏸️'
    
    // Add keyboard event listener
    const handleKeyboard = async (e) => {
      console.log('Key pressed globally:', e.key, 'PhotoSwipe open:', lightbox?.pswp?.isOpen)
      
      if (!lightbox?.pswp?.isOpen) {
        console.log('PhotoSwipe not open, ignoring key')
        return
      }
      
      console.log('Key pressed in PhotoSwipe:', e.key)
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        
        const currentSlide = lightbox.pswp.currSlide
        const currentIndex = lightbox.pswp.currIndex
        const imageUrl = currentSlide.data.src
        const urlParts = imageUrl.split('/')
        const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0])
        
        console.log('Deleting via keyboard:', filename)
        
        const deleted = await deleteImage(filename, null)
        if (deleted) {
          // Remember slideshow state
          const wasPlaying = slideshow.isPlaying()
          
          // Close lightbox, re-render grid, and reinitialize lightbox
          lightbox.pswp.close()
          
          setTimeout(() => {
            render()
            
            // Reinitialize lightbox
            if (lightbox) {
              lightbox.destroy()
            }
            initLightbox()
            
            // Reopen at the same or next position if there are still images
            if (files.length > 0) {
              // Set flag to control auto-play
              shouldAutoPlayOnInit = wasPlaying
              
              setTimeout(() => {
                const newIndex = Math.min(currentIndex, files.length - 1)
                lightbox.loadAndOpen(newIndex)
                
                // Update play button state
                setTimeout(() => {
                  const playBtn = document.querySelector('.pswp__button--play-pause-button')
                  if (playBtn) {
                    playBtn.innerHTML = wasPlaying ? '⏸️' : '▶️'
                  }
                }, 100)
              }, 300)
            }
          }, 100)
        }
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        e.stopPropagation()
        
        console.log('Space pressed, isPlaying:', slideshow.isPlaying())
        const playBtn = document.querySelector('.pswp__button--play-pause-button')
        if (slideshow.isPlaying()) {
          slideshow.pause()
          if (playBtn) playBtn.innerHTML = '▶️'
        } else {
          slideshow.play()
          if (playBtn) playBtn.innerHTML = '⏸️'
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyboard)
    
    // Remove listener on destroy
    lightbox.on('destroy', () => {
      document.removeEventListener('keydown', handleKeyboard)
    })
    
    // Initial centering and fade-in
    setTimeout(() => {
      applyFitMode()
      forceCenterImage()
      
      // Smooth fade-in for first image
      const allWraps = document.querySelectorAll('.pswp__zoom-wrap')
      allWraps.forEach((wrap, index) => {
        if (index === lightbox.pswp.currIndex) {
          // Current slide: fade in smoothly
          wrap.style.display = 'flex'
          requestAnimationFrame(() => {
            wrap.classList.add('pswp-visible')
          })
        } else {
          // Hide other slides
          wrap.style.display = 'none'
          wrap.classList.remove('pswp-visible')
        }
      })
    }, 100)
    
    // Keep forcing center on any change
    const observer = setInterval(() => {
      if (lightbox?.pswp?.isOpen) {
        forceCenterImage()
      } else {
        clearInterval(observer)
      }
    }, 100)
  })
  
  lightbox.on('change', () => {
    // Smooth crossfade transition
    const allWraps = document.querySelectorAll('.pswp__zoom-wrap')
    allWraps.forEach((wrap, index) => {
      if (index === lightbox.pswp.currIndex) {
        // Current slide: fade in
        wrap.style.display = 'flex'
        requestAnimationFrame(() => {
          wrap.classList.add('pswp-visible')
        })
      } else {
        // Hide others immediately
        wrap.style.display = 'none'
        wrap.classList.remove('pswp-visible')
      }
    })
    
    setTimeout(() => {
      forceCenterImage()
      applyFitMode()
    }, 50)
  })
  
  lightbox.on('slideActivate', () => {
    setTimeout(forceCenterImage, 10)
  })
  
  lightbox.on('destroy', () => slideshow.pause())
  
  lightbox.init()
}

// Fit mode controller
function initFitMode() {
  const fitModeSelect = document.getElementById('fitMode')
  
  fitModeSelect.addEventListener('change', () => {
    const mode = fitModeSelect.value
    document.body.setAttribute('data-fit-mode', mode)
    applyFitMode()
  })
  
  return fitModeSelect
}

// Directory browser
function initDirectoryBrowser() {
  const dirPath = document.getElementById('dirPath')
  const browseBtn = document.getElementById('browseBtn')
  const loadBtn = document.getElementById('loadBtn')
  const modal = document.getElementById('dirModal')
  const closeModal = document.getElementById('closeModal')
  const dirList = document.getElementById('dirList')
  const modalTitle = document.getElementById('modalTitle')
  
  let browsePath = null
  
  browseBtn.addEventListener('click', async () => {
    console.log('Browse button clicked')
    browsePath = dirPath.value || null
    console.log('Loading directories for:', browsePath || 'home')
    await showDirectories(browsePath)
    modal.style.display = 'flex'
    console.log('Modal displayed')
  })
  
  loadBtn.addEventListener('click', async () => {
    const dir = dirPath.value
    if (dir) {
      await loadImages(dir)
      if (lightbox) {
        lightbox.destroy()
      }
      initLightbox()
    }
  })
  
  closeModal.addEventListener('click', () => {
    modal.style.display = 'none'
  })
  
  async function showDirectories(dir) {
    try {
      const url = dir ? `/api/directories?dir=${encodeURIComponent(dir)}` : '/api/directories'
      const res = await fetch(url)
      const data = await res.json()
      
      modalTitle.textContent = data.currentDir || 'Select Directory'
      dirList.innerHTML = ''
      
      // Add quick access shortcuts
      const quickAccess = [
        { name: '💿 All Volumes', path: '/Volumes' },
        { name: '🏠 Home', path: '/Users/augustinas_the_fox' },
        { name: '📥 Downloads', path: '/Users/augustinas_the_fox/Downloads' },
        { name: '🖼️ Pictures', path: '/Users/augustinas_the_fox/Pictures' },
        { name: '🗂️ Documents', path: '/Users/augustinas_the_fox/Documents' },
        { name: '🖥️ Desktop', path: '/Users/augustinas_the_fox/Desktop' }
      ]
      
      const quickDiv = document.createElement('div')
      quickDiv.style.cssText = 'margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);'
      quickDiv.innerHTML = '<strong style="display: block; margin-bottom: 0.5rem; color: var(--text-primary);">Quick Access:</strong>'
      
      quickAccess.forEach(qa => {
        const btn = document.createElement('button')
        btn.className = 'btn'
        btn.textContent = qa.name
        btn.style.cssText = 'margin: 0.25rem; font-size: 0.75rem; padding: 0.4rem 0.75rem;'
        btn.onclick = () => showDirectories(qa.path)
        quickDiv.appendChild(btn)
      })
      dirList.appendChild(quickDiv)
      
      // Add parent directory option
      if (data.currentDir && data.currentDir !== '/') {
        const parentDiv = document.createElement('div')
        parentDiv.className = 'dir-item'
        parentDiv.textContent = '📁 .. (Parent Directory)'
        parentDiv.onclick = () => {
          const parent = data.currentDir.split('/').slice(0, -1).join('/')
          showDirectories(parent || '/')
        }
        dirList.appendChild(parentDiv)
      }
      
      // Add subdirectories
      data.directories.forEach(d => {
        const div = document.createElement('div')
        div.className = 'dir-item'
        div.textContent = '📁 ' + d.name
        div.onclick = () => showDirectories(d.path)
        dirList.appendChild(div)
      })
      
      // Add select button
      const selectBtn = document.createElement('button')
      selectBtn.className = 'btn'
      selectBtn.textContent = 'Select This Directory'
      selectBtn.style.marginTop = '1rem'
      selectBtn.onclick = async () => {
        dirPath.value = data.currentDir
        modal.style.display = 'none'
        await loadImages(data.currentDir)
        if (lightbox) {
          lightbox.destroy()
        }
        initLightbox()
      }
      dirList.appendChild(selectBtn)
      
    } catch (err) {
      console.error('Failed to load directories:', err)
      dirList.innerHTML = '<p>Failed to load directories</p>'
    }
  }
}

// Initialize app
window.addEventListener('DOMContentLoaded', async () => {
  slideshow = initSlideshow()
  initFitMode()
  
  // Set default fit mode to height
  document.body.setAttribute('data-fit-mode', 'height')
  
  const browserFunctions = initDirectoryBrowser()
  
  // Show message prompting user to select directory
  const grid = document.getElementById('grid')
  grid.innerHTML = '<div style="text-align: center; padding: 4rem; color: var(--text-secondary);"><h2 style="margin-bottom: 1rem;">Welcome to Image Gallery</h2><p style="margin-bottom: 2rem;">Select a directory to view images</p><button class="btn" style="padding: 1rem 2rem; font-size: 1rem;" onclick="document.getElementById(\'browseBtn\').click()">📁 Browse Directories</button></div>'
  
  // Don't auto-load any directory
  // await loadImages()
  // initLightbox()
})
