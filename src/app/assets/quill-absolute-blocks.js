


if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  console.log('[quill-absolute-blocks] script loaded');

  (function() {
    // Wait for DOM and Quill
    function ready(fn) {
      if (document.readyState !== 'loading') fn();
      else document.addEventListener('DOMContentLoaded', fn);
    }

    // Wait for window.quillEditorInstance to be available
    function waitForQuillInstance(callback, interval = 100, maxAttempts = 50) {
      let attempts = 0;
      function check() {
        if (typeof window !== 'undefined' && window.quillEditorInstance) {
          callback(window.quillEditorInstance);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, interval);
        } else {
          console.warn('[quill-absolute-blocks] Quill instance not found after waiting');
        }
      }
      check();
    }

    (function (){
      if (typeof window !== 'undefined') {
        window.makeDivsDraggableInQuill = makeDivsDraggableInQuill;
        window.setupQuillAbsoluteBlocksObserver = function(editorContainer, onBlockAdded) {
          const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
              if (mutation.type === 'childList') {
                // Call your logic for new blocks/divs here
                onBlockAdded(mutation.addedNodes);
              }
            }
          });
          observer.observe(editorContainer, { childList: true, subtree: true });
          return observer;
        };
      }
    })();

    // Make all .ql-custom-div-block elements inside the Quill editor draggable
    // Accepts: (container, addedNodes, updater) or (addedNodes, updater) for backward compatibility
    function makeDivsDraggableInQuill(arg1, arg2) {
      console.log('[quill-absolute-blocks] makeDivsDraggableInQuill called with arguments', arg1, arg2);
      var container, updater;

      // Detect args
      if (arg1 instanceof Element) {
        // Called as (container, addedNodes, updater)
        container = arg1;
      } else
        return;
      if (typeof arg2 === 'function') {
          updater = arg2;
      } else
        return;

      if (typeof window !== 'undefined') {
        // Called as (addedNodes, updater) or (quill)
        var quill = window.quillEditorInstance;
        if (quill && quill.root) {
          var editorEl = quill.root;
          container = editorEl.closest('.ql-container') || editorEl.parentElement;
          if (!container) container = editorEl.parentElement;
        } else {
          // fallback: try document.querySelector('.ql-container')
          container = document.querySelector('.ql-container');
        }
      }
      if (!container) {
        console.warn('[quill-absolute-blocks] No container found for draggable blocks');
        return;
      }

      // Create overlay container (optional, for debug/visualization)
      // Always select .ql-custom-div-block elements (not just addedNodes)
      blocks = Array.from(container.querySelectorAll('.ql-custom-div-block'));
      if (blocks && blocks.length) {
        // Also include any new .ql-custom-div-blocks in addedNodes
        Array.from(blocks).forEach(function(node) {
          if (node.nodeType === 1 && node.classList.contains('ql-custom-div-block') && !blocks.includes(node)) {
            blocks.push(node);
          }
        });
      }
      console.log('[quill-absolute-blocks] Making blocks draggable', {
        totalBlocks: blocks.length,
        blocks: blocks.map(el => ({
          id: el.getAttribute('data-custom-div-id') || el.id || null,
          left: el.style.left,
          top: el.style.top
        }))
      });

      blocks.forEach(function(el) {
        // Make draggable only if not already set
        if (el._quillDraggable) return;
        el._quillDraggable = true;
        el.style.position = 'absolute';
        el.style.cursor = 'move';
        el.style.pointerEvents = 'auto';
        // Restore position from data attributes if present
        var rect = container.getBoundingClientRect();
        if (el.dataset.leftPct && el.dataset.topPct) {
          el.style.left = (parseFloat(el.dataset.leftPct) * rect.width) + 'px';
          el.style.top = (parseFloat(el.dataset.topPct) * rect.height) + 'px';
        } else {
          if (!el.style.left) el.style.left = '0px';
          if (!el.style.top) el.style.top = '0px';
        }
        el.onmousedown = function(e) {
          if (!document.getElementById('quill-absolute-blocks-overlay')) {
            var overlay = document.createElement('div');
            overlay.classList.add('quill-absolute-block-drag-overlay');
            overlay.style.position = 'absolute';
            overlay.style.width = el.offsetWidth + 'px';
            overlay.style.height = el.offsetHeight + 'px';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '1000';
            overlay.id = 'quill-absolute-blocks-overlay';
            overlay.style.border = '2px solid red';
            overlay.style.background = 'rgba(255,0,0,0.08)';
            overlay.style.boxSizing = 'border-box';
            overlay.style.overflow = 'visible';
            setTimeout(function() {
              var orect = overlay.getBoundingClientRect();
              var crect = el.getBoundingClientRect();
              console.log('[quill-absolute-blocks] overlay', orect.width, orect.height, orect.left, orect.top);
              console.log('[quill-absolute-blocks] container', crect.width, crect.height, crect.left, crect.top);
            }, 500);
            if (getComputedStyle(el).position === 'static') {
              el.style.position = 'relative';
            }
            el.style.overflow = 'visible';
            el.appendChild(overlay);
          }else{
            el.removeChild(el.querySelector('.quill-absolute-block-drag-overlay'));
          }
          console.log('[quill-absolute-blocks] Drag start', {
            blockId: el.getAttribute('data-custom-div-id') || el.id || null,
            startX: e.clientX,
            startY: e.clientY,
            left: el.style.left,
            top: el.style.top
          });
          e.preventDefault();
          var rect = container.getBoundingClientRect();
          if (!el.style.left) el.style.left = '0px';
          if (!el.style.top) el.style.top = '0px';
          var startX = e.clientX, startY = e.clientY;
          var origX = parseInt(el.style.left, 10) || 0;
          var origY = parseInt(el.style.top, 10) || 0;
          var blockId = el.getAttribute('data-custom-div-id') || el.id || null;
          function onMove(ev) {
            var newX = origX + (ev.clientX - startX);
            var newY = origY + (ev.clientY - startY);
            el.style.left = newX + 'px';
            el.style.top = newY + 'px';
            console.log('[quill-absolute-blocks] Drag move', {
              blockId: blockId,
              newX: newX,
              newY: newY
            });
            el.setAttribute('data-x', newX);
            el.setAttribute('data-y', newY);
          }
          function onUp(ev) {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            var finalX = parseInt(el.style.left, 10) || 0;
            var finalY = parseInt(el.style.top, 10) || 0;
            console.log('[quill-absolute-blocks] Drag end', {
              blockId: blockId,
              finalX: finalX,
              finalY: finalY
            });
            if (typeof updater === 'function' && blockId) {
              updater(blockId, finalX, finalY);
            }
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        };
        // Make block focusable to receive keyboard events
        el.tabIndex = 0;

        document.addEventListener('keydown', function(e) {
            console.log('[quill-absolute-blocks] Keydown event', {
              key: e.key,
              code: e.code,
              target: e.target
            });
            if (e.key === 'Delete' || e.code === 'Delete') {
              console.log('[quill-absolute-blocks] delete Event target:', el,el.parentNode);
              if (el.parentNode) {
                el.parentNode.removeChild(el);
              }
              console.log('[quill-absolute-blocks] Dispatching delete event for block:', e);
              const deleteEvent = new CustomEvent('quill-absolute-block-delete', {
                detail: { blockId }
              });
              el.dispatchEvent(deleteEvent);
              e.preventDefault();
              e.stopPropagation();
            }
          });
      });
    }

    ready(function() {
      console.log('[quill-absolute-blocks] DOM ready, waiting for Quill instance');
      waitForQuillInstance(function(quill) {
        makeDivsDraggableInQuill(quill);
        // Optionally, you can re-run makeDivsDraggableInQuill(quill) after content changes
      });
    });

  })();
}

