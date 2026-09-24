// Minimal Quill 2.x Image Manipulation module (vanilla, no dependencies)
// Usage: import and register in Angular after Quill is loaded
// Features: Resize, Drag-and-Drop, Visual Drop Indicator

// Minimal Quill 2.x Image Manipulation module (vanilla, no dependencies)
// Usage: import and register in Angular after Quill is loaded
// Features: Resize, Drag-and-Drop, Visual Drop Indicator

export class ImageManipulation {
  constructor(quill, options) {
    this.quill = quill;
    this.options = options || {};
    this.overlay = null;
    this.img = null;
    this.boxes = [];
    this.handleSize = 8;
    this.active = false;
    this.quill.root.addEventListener('click', this.checkImage.bind(this));
    // Enable drag by mousedown on image
    // Use event delegation: listen for mousedown on root, check if image or handle
    this.quill.root.addEventListener('mousedown', this.imageOrHandleMouseDown.bind(this));
    // Prevent default browser drag for images
    this.quill.root.addEventListener('dragstart', (evt) => {
      if (evt.target && evt.target.tagName === 'IMG') {
        evt.preventDefault();
      }
    });

    // Keyboard delete/backspace support for selected image
    this._boundKeydown = this.handleKeydown.bind(this);
    this.quill.root.addEventListener('keydown', this._boundKeydown);
  }

  // Handle Delete/Backspace to remove selected image and overlay
  handleKeydown(evt) {
    if (!this.active || !this.img) return;
    if (evt.key === 'Delete' || evt.key === 'Backspace') {
      // Prevent default browser behavior
      evt.preventDefault();
      // Remove the image from Quill
      const index = this.getImageBlotIndex(this.img);
      if (index >= 0) {
        this.quill.deleteText(index, 1, 'user');
      }
      // Remove overlay/ghost
      this.hideOverlay();
    }
  }

  // Drag-and-drop logic for moving images (precise caret placement, works from image, overlay, or handle)
  imageOrHandleMouseDown(evt) {
    // Only left mouse button
    if (evt.button !== 0) return;
    // Find the image element (either the target is the image, or a handle/overlay child of the overlay for the image)
    let img = null;
    if (evt.target && evt.target.tagName === 'IMG') {
      img = evt.target;
    } else if (evt.target && evt.target.classList && evt.target.classList.contains('quill-image-resize-handle')) {
      // Handle: parentNode is overlay, overlay.img is the image
      if (this.overlay && this.img) img = this.img;
    } else if (evt.target && this.overlay && this.overlay.contains(evt.target)) {
      // Overlay: parentNode is overlay, overlay.img is the image
      if (this.img) img = this.img;
    }
    if (!img) return;
    evt.preventDefault();
    let dragImgIndex = this.getImageBlotIndex(img);
    let startX = evt.clientX;
    let startY = evt.clientY;
    let dragging = false;
    let dragStarted = false;
    let dropIndicator = null;
    let lastIndex = null;
    let ghostImg = null;
    // Temporarily disable pointer events on overlay/handles for drag threshold
    if (this.overlay) this.overlay.style.pointerEvents = 'none';
    if (this.boxes) this.boxes.forEach(b => b.style.pointerEvents = 'none');

    const dragMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragStarted && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragStarted = true;
        // Only show overlay after drag threshold
        this.showOverlay(img);
        // --- Caret-style drop indicator ---
        dropIndicator = document.createElement('div');
        dropIndicator.style.position = 'absolute';
        dropIndicator.style.width = '2px';
        dropIndicator.style.background = '#f44336';
        dropIndicator.style.height = '1.5em';
        dropIndicator.style.zIndex = 2000;
        dropIndicator.style.pointerEvents = 'none';
        dropIndicator.style.display = 'none';
        document.body.appendChild(dropIndicator);

        // --- Ghost image for drag animation ---
        ghostImg = document.createElement('img');
        ghostImg.src = img.src;
        ghostImg.style.position = 'fixed';
        ghostImg.style.pointerEvents = 'none';
        ghostImg.style.opacity = '0.6';
        ghostImg.style.zIndex = 3000;
        ghostImg.style.width = img.width + 'px';
        ghostImg.style.height = img.height + 'px';
        ghostImg.style.left = e.clientX - img.width / 2 + 'px';
        ghostImg.style.top = e.clientY - img.height / 2 + 'px';
        document.body.appendChild(ghostImg);
        // Optionally hide original image for clarity
        img.style.opacity = '0.2';
      }
      if (dragStarted) {
        if (this.overlay) this.overlay.style.pointerEvents = 'none';
        if (this.boxes) this.boxes.forEach(b => b.style.pointerEvents = 'none');
        const quill = this.quill;
        const rootRect = quill.root.getBoundingClientRect();
        let index = 0;
        let range = null;
        if (document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        } else if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        }
        if (range) {
          let node = range.startContainer;
          let offset = range.startOffset;
          // If text node, count characters from start of editor
          if (node.nodeType === Node.TEXT_NODE) {
            let charCount = offset;
            let walker = document.createTreeWalker(quill.root, NodeFilter.SHOW_TEXT, null, false);
            let currentNode = walker.nextNode();
            while (currentNode && currentNode !== node) {
              charCount += currentNode.textContent.length;
              currentNode = walker.nextNode();
            }
            index = charCount;
          } else {
            // If element node, count all text and element nodes before it
            let charCount = 0;
            let found = false;
            let walker = document.createTreeWalker(quill.root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
            let currentNode = walker.nextNode();
            while (currentNode) {
              if (currentNode === node) {
                found = true;
                break;
              }
              if (currentNode.nodeType === Node.TEXT_NODE) {
                charCount += currentNode.textContent.length;
              } else if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.tagName === 'IMG') {
                charCount += 1; // count image as 1
              }
              currentNode = walker.nextNode();
            }
            index = found ? charCount : quill.getLength() - 1;
          }
        } else {
          // fallback: drop at end of document
          index = quill.getLength() - 1;
        }
        // Clamp index to valid range
        index = Math.max(0, Math.min(index, quill.getLength() - 1));
        // Show drop indicator as a visible vertical caret at the drop position
        let bounds = quill.getBounds(index);
        dropIndicator.style.left = (rootRect.left + bounds.left + window.pageXOffset - 1) + 'px';
        dropIndicator.style.top = (rootRect.top + window.pageYOffset) + 'px';
        dropIndicator.style.height = rootRect.height + 'px';
        dropIndicator.style.width = '3px';
        dropIndicator.style.background = '#1976d2';
        dropIndicator.style.borderRadius = '2px';
        dropIndicator.style.opacity = '0.85';
        dropIndicator.style.display = 'block';
        dragging = true;
        dropIndicator._quillIndex = index;
        lastIndex = index;

        // Move ghost image with mouse
        if (ghostImg) {
          ghostImg.style.left = e.clientX - ghostImg.width / 2 + 'px';
          ghostImg.style.top = e.clientY - ghostImg.height / 2 + 'px';
        }
      }
    };
    const dragUp = (e) => {
      window.removeEventListener('mousemove', dragMove);
      window.removeEventListener('mouseup', dragUp);
      if (dropIndicator) dropIndicator.remove();
      if (ghostImg) ghostImg.remove();
      if (img) img.style.opacity = '';
      // Restore pointer events after drag
      if (this.overlay) this.overlay.style.pointerEvents = 'none';
      if (this.boxes) this.boxes.forEach(b => b.style.pointerEvents = 'all');
      if (dragStarted && dragging) {
        const index = lastIndex || 0;
        if (typeof dragImgIndex === 'number' && dragImgIndex !== index) {
          this.moveImageBlot(dragImgIndex, index);
        }
        this.hideOverlay();
      } else {
        // Not a drag, treat as click
        this.showOverlay(img);
      }
    };
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('mouseup', dragUp);
  }
    // Helper: get Quill blot index for image
    getImageBlotIndex(img) {
      // Try to get the Quill document index for the image node
      const blot = this.quill.constructor.find ? this.quill.constructor.find(img) : null;
      if (blot && blot.offset && typeof blot.offset === 'function') {
        return blot.offset(this.quill.scroll);
      }
      // Fallback: walk the Quill document to find the image embed index
      const delta = this.quill.getContents();
      let index = 0;
      for (let i = 0; i < delta.ops.length; i++) {
        const op = delta.ops[i];
        if (op.insert && op.insert.image) {
          // Compare src
          if (img.src && (op.insert.image === img.src || (img.src.endsWith(op.insert.image) || op.insert.image.endsWith(img.src)))) {
            return index;
          }
          index += 1;
        } else if (typeof op.insert === 'string') {
          index += op.insert.length;
        } else {
          index += 1;
        }
      }
      return -1;
    }

    // Helper: get Quill index from Y position
    getDropIndexFromY(y, quillRoot) {
      let range = null;
      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(0, y);
        if (pos) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      } else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(0, y);
      }
      if (!range) return null;
      let node = range.startContainer;
      while (node && node !== quillRoot && node.parentNode !== quillRoot) {
        node = node.parentNode;
      }
      if (!node) return null;
      // Find index in Quill
      const find = this.quill.constructor.find;
      let blot = find ? find(node) : null;
              console.log('Found blot:', blot, 'Type:', blot && blot.statics && blot.statics.blotName, 'offset:', blot && blot.offset);
              try {
                if (blot && typeof blot.offset === 'function') {
                  if (blot && blot.offset) return blot.offset(this.quill.scroll);
                    return null;
                } else {
                  console.warn('blot.offset is not a function', blot);
                }
              } catch (err) {
                console.error('Error calling blot.offset:', err, blot);
              }

    }

    // Helper: move image blot in Quill
    moveImageBlot(fromIndex, toIndex) {
      if (fromIndex === toIndex) return;
      // Get the image source and dimensions at fromIndex
      const delta = this.quill.getContents();
      let imgSrc = null;
      let imgLength = 1;
      let imgIndex = 0;
      let curr = 0;
      let width = null;
      let height = null;
      // Find the image embed at the correct document index
      for (let i = 0; i < delta.ops.length; i++) {
        const op = delta.ops[i];
        if (op.insert && op.insert.image) {
          if (curr === fromIndex) {
            imgSrc = op.insert.image;
            imgLength = (typeof op.insert.image === 'string') ? 1 : op.insert.image.length;
            imgIndex = curr;
            // Try to get width/height from DOM if possible
            const imgs = Array.from(this.quill.root.querySelectorAll('img'));
            const imgNode = imgs.find(img => img.src === imgSrc || img.src.endsWith(imgSrc) || imgSrc.endsWith(img.src));
            if (imgNode) {
              width = imgNode.width || imgNode.style.width;
              height = imgNode.height || imgNode.style.height;
            }
            break;
          }
        }
        curr += (typeof op.insert === 'string') ? op.insert.length : 1;
      }
      if (!imgSrc) return;
      // Remove the image at fromIndex
      this.quill.deleteText(fromIndex, imgLength, 'user');
      // Insert the image at toIndex (adjust if moving forward)
      let insertAt = toIndex;
      if (toIndex > fromIndex) insertAt = toIndex - imgLength;
      // Insert with width/height as inline style if available
      if (width || height) {
        // Insert a custom HTML image tag with style
        let style = '';
        if (width) style += `width:${typeof width === 'number' ? width + 'px' : width};`;
        if (height) style += `height:${typeof height === 'number' ? height + 'px' : height};`;
        const html = `<img src="${imgSrc}" style="${style}" />`;
        this.quill.insertEmbed(insertAt, 'image', imgSrc, 'user');
        // After insertion, set the style on the DOM node
        setTimeout(() => {
          const imgs = Array.from(this.quill.root.querySelectorAll('img'));
          const imgNode = imgs.find(img => img.src === imgSrc || img.src.endsWith(imgSrc) || imgSrc.endsWith(img.src));
          if (imgNode) {
            if (width) imgNode.width = typeof width === 'number' ? width : parseInt(width);
            if (height) imgNode.height = typeof height === 'number' ? height : parseInt(height);
          }
        }, 0);
      } else {
        this.quill.insertEmbed(insertAt, 'image', imgSrc, 'user');
      }
      // Optionally, set selection to the moved image
      this.quill.setSelection(insertAt + 1, 0, 'user');
    }

  checkImage(evt) {
    if (evt.target && evt.target.tagName === 'IMG') {
      this.showOverlay(evt.target);
    } else if (this.overlay) {
      this.hideOverlay();
    }
  }

  showOverlay(img) {
    this.hideOverlay();
    this.img = img;
    const rect = img.getBoundingClientRect();
    const containerRect = this.quill.root.parentNode.getBoundingClientRect();
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      left: `${rect.left - containerRect.left + this.quill.root.parentNode.scrollLeft}px`,
      top: `${rect.top - containerRect.top + this.quill.root.parentNode.scrollTop}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: '1px solid #09f',
      boxSizing: 'border-box',
      zIndex: 1000,
      pointerEvents: 'none',
    });
    this.quill.root.parentNode.appendChild(this.overlay);
    this.createHandles();
    this.active = true;
  }

  hideOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.img = null;
      this.boxes.forEach(b => b.remove());
      this.boxes = [];
      this.active = false;
    }
  }
  // Clean up event listeners if needed (optional, for integration)
  destroy() {
    this.quill.root.removeEventListener('keydown', this._boundKeydown);
  }

  createHandles() {
    const positions = [
      ['nw', 0, 0],
      ['ne', 1, 0],
      ['sw', 0, 1],
      ['se', 1, 1],
    ];
    positions.forEach(([pos, x, y]) => {
      const box = document.createElement('div');
      Object.assign(box.style, {
        position: 'absolute',
        width: `${this.handleSize}px`,
        height: `${this.handleSize}px`,
        background: '#fff',
        border: '1px solid #09f',
        zIndex: 1001,
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `translate(-${x * 100}%, -${y * 100}%)`,
        cursor: `${pos}-resize`,
        pointerEvents: 'all',
      });
      box.addEventListener('mousedown', this.handleMousedown.bind(this, pos));
      this.overlay.appendChild(box);
      this.boxes.push(box);
    });
  }

  handleMousedown(corner, evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.startX = evt.clientX;
    this.startY = evt.clientY;
    this.startWidth = this.img.width;
    this.startHeight = this.img.height;
    this.ratio = this.img.width / this.img.height;
    this.activeCorner = corner;
    // Bind once and store so removeEventListener works
    this._boundMousemove = this.handleMousemove.bind(this);
    this._boundMouseup = this.handleMouseup.bind(this);
    document.addEventListener('mousemove', this._boundMousemove);
    document.addEventListener('mouseup', this._boundMouseup);
  }

  handleMousemove = (evt) => {
    let deltaX = evt.clientX - this.startX;
    let deltaY = evt.clientY - this.startY;
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    if (this.activeCorner === 'se') {
      newWidth += deltaX;
      newHeight += deltaY;
    } else if (this.activeCorner === 'sw') {
      newWidth -= deltaX;
      newHeight += deltaY;
    } else if (this.activeCorner === 'ne') {
      newWidth += deltaX;
      newHeight -= deltaY;
    } else if (this.activeCorner === 'nw') {
      newWidth -= deltaX;
      newHeight -= deltaY;
    }
    if (newWidth > 20 && newHeight > 20) {
      this.img.width = newWidth;
      this.img.height = newHeight;
      this.showOverlay(this.img);
    }
  };

  handleMouseup = () => {
    document.removeEventListener('mousemove', this._boundMousemove);
    document.removeEventListener('mouseup', this._boundMouseup);
    this.showOverlay(this.img);
  };
}
