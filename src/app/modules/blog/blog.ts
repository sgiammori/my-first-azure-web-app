import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ChangeDetectorRef, Component, DOCUMENT, effect, Inject, inject, PLATFORM_ID, signal } from '@angular/core';
import { CustomLinkModalComponent } from './components/custom-link-modal/custom-link-modal.component';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { WINDOW } from '../../shared/window';
import { FacebookapiService } from '../../core/services/facebookapi.service';
import { PersistanceService } from '../../core/services/persistance';
// Extend the Window interface to include angularComponentRef for TypeScript
declare global {
  interface Window {
    angularComponentRef?: any;
    quillEditorInstance?: any;
    renderAbsoluteBlocks?: () => void;
  }
}
import { QuillModule } from 'ngx-quill';
import { environment } from '../../shared/environments';
import { IAuthors, INews } from '../../shared/models/INews';
import { Router } from '@angular/router';
import { Homeblogtunnel } from '../../core/services/data/homeblogtunnel';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, QuillModule, FormsModule, ReactiveFormsModule, CustomLinkModalComponent],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
  providers: [Title, Meta]
})

export class Blog {

  news = signal<INews>({
    id: 0,
    title: '',
    subtitle: '',
    content: '',
    date: new Date(),
    authors: []
  });

  facebookSdkReady = signal(false);
  facebookSdkReadySubscription = signal<any>(null);
  errore = signal('');
  info = signal('');

  /** Guard flag to prevent recursive updates when programmatically updating Quill content */
  isProgrammaticQuillUpdate = signal(false);
  /** Injected WINDOW token for SSR-safe access to window object. */
  private window = inject(WINDOW);
  // Modal state for custom link modal (signals)
  showCustomLinkModal = signal(false);
  // Reference to the Quill editor instance for programmatic access (e.g. to get selection, insert links, etc.)
  quillEditorInstance = signal<any>(null);
  /** Raw HTML loaded from the server and rendered in the viewer/editor. Bound to the Quill editor. */
  htmlContent = signal('');
    /** Holds HTML to be set in Quill if editor is not yet ready */
  private pendingQuillHtml = signal<string | null>(null);

  /**
   * Returns the first free id (max id + 1 or 1 if empty) in newsList
   */
  getFirstFreeId(): number {
    const newsList = this.homeblogtunnelservice.getNewsList();
    if (!newsList.length) return 1;
    const usedIds = new Set(newsList.map(n => n.id));
    let freeId = 1;
    while (usedIds.has(freeId)) {
      freeId++;
    }
    return freeId;
  }

  /**
   * Generates the default HTML template for a new news item, using the first free id
   */
  getDefaultHtmlContent(): string {
    const id = this.getFirstFreeId();
    return `
      <div class="blog-card card mb-4 shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h5 class="card-title mb-0 blog-card-title">Sample News Title</h5>
              <p class="card-text text-muted mb-1 blog-card-subtitle">Sample subtitle for the news item</p>
            </div>
            <span class="badge rounded-pill bg-gradient blog-badge">#${id}</span>
          </div>
          <div class="mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-calendar-event text-primary"></i>
            <small class="text-body-secondary">${new Date().toLocaleDateString()}</small>
          </div>
          <div class="mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-people text-primary"></i>
            <span class="fw-bold">Authors:</span>
            <span>John Doe, sgiammori</span>
          </div>
          <div class="mb-2">
            <span class="fw-bold">Content:</span>
            <div class="card-text blog-card-content">This is a sample content for the news item. You can edit this template to create a new news post.</div>
          </div>
        </div>
      </div>
    `;
  }

  /** FormControl for Quill editor. Keeps editor and signal in sync. */
  editorControl = new FormControl('');
  /** Temporary signal to hold blocks added by MutationObserver */
  // tempBlocks removed (custom div logic)
  // To preserve the selection range when opening the custom link modal and restore it after inserting the link
  private savedRange: any = null;
  // Temporary storage for the text to be linked, extracted from the current selection when opening the modal
  selectedLinkText = signal('');
  isAdmin = signal(false);

  // Quill toolbar configuration (must be a property, not inline in template)
  // Includes a custom link button and image resize module
  quillModules = {
    toolbar: {
      container: '#custom-toolbar',
      handlers: {
        customLink: () => this.openCustomLinkModal()
      }
    },
    imageResize: {}
  };

  constructor(
    public homeblogtunnelservice: Homeblogtunnel,
    private facebookservice: FacebookapiService,
    private persistance: PersistanceService,
    private cdr: ChangeDetectorRef,
    private titleService: Title, private metaService: Meta, @Inject(PLATFORM_ID) private platformId: Object, @Inject(DOCUMENT) private doc: Document
  ) {
    this.titleService.setTitle('Blog | Novità, Tutorial e Approfondimenti | Stefano Giammori');
    this.metaService.updateTag({ name: 'description', content: 'Leggi articoli, guide e novità su sviluppo web, tecnologia, cloud e innovazione. Il blog di Stefano Giammori per chi vuole restare aggiornato.' });
    this.metaService.updateTag({ property: 'og:title', content: 'Blog - Stefano Giammori' });
    this.metaService.updateTag({ property: 'og:description', content: 'Leggi articoli, guide e novità su sviluppo web, tecnologia, cloud e innovazione.' });
    this.metaService.updateTag({ property: 'og:type', content: 'profile' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://raw.githubusercontent.com/sgiammori/photoShoots/refs/heads/main/android_logo_storicoapp_fb.png' });
    this.metaService.updateTag({ property: 'og:url', content: environment.baseUrl + '/blog' });
    if (isPlatformBrowser(this.platformId)) {
      const existing = this.doc.querySelector('link[rel="canonical"]');
      if (existing) existing.remove();
      const canonical: HTMLLinkElement = this.doc.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', environment.baseUrl + '/oltreCodice');
      this.doc.head.appendChild(canonical);
    }
    /*// If no news loaded, ensure default template is set
    const defaultHtml = this.getDefaultHtmlContent();
    this.htmlContent.set(defaultHtml);
    if (this.editorControl) {
      this.editorControl.setValue(defaultHtml, { emitEvent: false });
    }*/
    // Subscribe to Facebook SDK readiness
    this.facebookSdkReadySubscription.set(this.facebookservice.ready.subscribe(isReady => {
      this.facebookSdkReady.set(isReady);
      // console.log('Facebook SDK ready state updated:', isReady);
      this.cdr.markForCheck();
    }));

    // Ensure the custom HR blot is registered before Quill initializes (browser only)
    if (typeof window !== 'undefined') {
      if (typeof (window as any).Quill !== 'undefined') {
        // If Quill is already loaded, register immediately
        (window as any)._hrBlotRegistered = false; // allow re-registration in dev
        // Temporary dummy class to allow static method call
        class DummyBlog { static registerHrBlot = Blog?.registerHrBlot; }
        if (typeof DummyBlog.registerHrBlot === 'function') DummyBlog.registerHrBlot();
      } else {
        // If Quill is not loaded yet, register on window load
        window.addEventListener('load', () => {
          if (typeof Blog?.registerHrBlot === 'function') Blog.registerHrBlot();
        });
      }
    }
    // --- EFFECT: Watch pendingQuillHtml and quillEditorInstance ---
    effect(() => {
      const html = this.pendingQuillHtml();
      const quill = this.quillEditorInstance();
      // console.log('[effect] RUNNING. pendingQuillHtml:', html, 'quillEditorInstance:', quill);
      if (html && quill) {
        this.isProgrammaticQuillUpdate.set(true);
        try {
          quill.clipboard.dangerouslyPasteHTML(html);
          const newHtml = quill.root.innerHTML;
          // console.log('[effect] After dangerouslyPasteHTML, Quill root innerHTML:', newHtml);
          this.htmlContent.set(newHtml);
          if (this.editorControl) {
            this.editorControl.setValue(newHtml, { emitEvent: false });
          }
        } catch (err) {
          console.error('[effect] Error applying pendingQuillHtml:', err);
        } finally {
          this.pendingQuillHtml.set(null);
          this.isProgrammaticQuillUpdate.set(false);
        }
      }
    });
  }

  // Initialize htmlContent with the correct id
  async ngOnInit() {
    // (TEMPORARY DEBUG) FormControl valueChanges subscription commented out to isolate Quill overwrite issue
    // this.editorControl.valueChanges.subscribe((value) => {
    //   try {
    //     if (!this.isProgrammaticQuillUpdate() && this.htmlContent() !== value) {
    //       this.htmlContent.set(value ?? '');
    //     }
    //   } catch (err) {
    //     console.error('[ERROR] in editorControl.valueChanges subscription', err);
    //   }
    // });
      // Ensure the default template is set on first load if not editing
      if (!this.pendingQuillHtml()) {
        const defaultHtml = this.getDefaultHtmlContent();
        this.pendingQuillHtml.set(defaultHtml);
        // console.log('[ngOnInit] Set pendingQuillHtml to default template:', defaultHtml);
      } else {
        // console.log('[ngOnInit] pendingQuillHtml already set:', this.pendingQuillHtml());
      }
      // (TEMPORARY DEBUG) FormControl valueChanges subscription commented out to isolate Quill overwrite issue
      // this.editorControl.valueChanges.subscribe((value) => {
      //   try {
      //     if (!this.isProgrammaticQuillUpdate() && this.htmlContent() !== value) {
      //       this.htmlContent.set(value ?? '');
      //     }
      //   } catch (err) {
      //     console.error('[ERROR] in editorControl.valueChanges subscription', err);
      //   }
      // });
  }

  ngOnDestroy() {
    if (this.facebookSdkReadySubscription()) {
      this.facebookSdkReadySubscription().unsubscribe();
    }
  }

  async admin() {
    const password = prompt('Inserisci password di amministratore');
    if (!password) return;
    try {
      let res;
      if(typeof window !== 'undefined' && this.window.location.href.includes('localhost'))
         res = await fetch('/api/authenticates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
      else
        res = await fetch(environment.funcUrl + '/api/authenticates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      // console.log('Admin authentication response', res);
      if (res?.ok) {
        this.isAdmin.set(true);
        // If Quill editor instance is available, update its content too
        const htmlToSet = this.getDefaultHtmlContent();
        this.pendingQuillHtml.set(htmlToSet);

        this.news.set({
          id: 0,
          title: '',
          subtitle: '',
          content: '',
          date: new Date(),
          authors: []
        });
      } else {
        alert('Password errata'+(res ? '.' : null));
      }
    } catch (e) {
      alert('Errore di connessione al server');
    }
  }

  /**
   * Allows admin to download the server data.txt file as JSON.
   */
  async downloadDataText() {
    try {
      let url: string;
			if (isPlatformServer(this.platformId)) {
				url = environment.baseUrl + '/api/news';
			} else {
				url = '/api/news';
			}
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Errore nel download del file');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'data.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      alert('Download fallito: ' + (e?.message || e));
    }
  }

  deleteNews(id: number) {
    // Remove the news item with the given id from newsList
    const idx = this.homeblogtunnelservice.getNewsList().findIndex(n => n.id === id);
    if (idx !== -1) {
      const updatedNewsList = [...this.homeblogtunnelservice.getNewsList()];
      updatedNewsList.splice(idx, 1);
      this.homeblogtunnelservice.setNewsList(updatedNewsList);
      // Persist the updated newsList
      this.persistance.saveNewsList(this.homeblogtunnelservice.getNewsList());
    }
  }

  editNews(news: INews) {
    // console.log('[editNews] Editing news item', news);
    // Set all relevant signals for the news item
    this.news.set({
      id: news.id,
      title: news.title,
      subtitle: news.subtitle,
      content: news.content,
      date: news.date ? new Date(news.date) : new Date(),
      authors: Array.isArray(news.authors) ? news.authors : []
    });

    // Build the editable string in the required order
    const dateString = news.date ? new Date(news.date).toLocaleDateString() : '';
    const authorsString = Array.isArray(news.authors) ? news.authors.map(a => a.author).join(', ') : '';
    // Recreate the card HTML just before collecting news item fields
    const cardHtml = `
      <div class="blog-card card mb-4 shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h5 class="card-title mb-0 blog-card-title">${news.title}</h5>
              <p class="card-text text-muted mb-1 blog-card-subtitle">${news.subtitle}</p>
            </div>
            <span class="badge rounded-pill bg-gradient blog-badge">#${String(news.id)}</span>
          </div>
          <div class="mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-calendar-event text-primary"></i>
            <small class="text-body-secondary">${dateString}</small>
          </div>
          <div class="mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-people text-primary"></i>
            <span class="fw-bold">Authors:</span>
            <span>${authorsString}</span>
          </div>
          <div class="mb-2">
            <span class="fw-bold">Content:</span>
            <div class="card-text blog-card-content">${news.content}</div>
          </div>
        </div>
      </div>
    `;

    // Collect all relevant fields for the news item
    const newsItem = {
      id: news.id,
      title: news.title,
      subtitle: news.subtitle,
      content: news.content,
      authors: news.authors,
      date: news.date,
      htmlContent: cardHtml,
      uploadedOnFacebook: false
    };

    // Always set pendingQuillHtml to the card HTML for consistency
    this.pendingQuillHtml.set(cardHtml);
    // console.log('[editNews] Queued HTML to set in Quill editor (pendingQuillHtml)', { htmlToSet: cardHtml });
    // The effect or onQuillEditorCreated will handle applying this to the editor when ready
  }

  /**
   * Post all news items to the Facebook Page as a single post.
   * Requires pageId and pageAccessToken to be set in the component.
   */
  pageId: string = '1016004348267631';
  pageAccessToken: string = '';

  async uploadOnFacebook($evt: any, news: INews) {
    this.info.set('');
    this.errore.set('');
    if (!this.facebookSdkReady()) {
      this.errore.set('Facebook SDK non è ancora pronto. Riprova tra qualche secondo.');
      return;
    }
    if (!this.pageId) {
      this.errore.set('ID Pagina non impostato.');
      return;
    }
    // Compose the message from the selected news item
    const newsItem = this.homeblogtunnelservice.getNewsList().find(n => n.id === news.id);
    if (!newsItem) {
      this.errore.set('News item not found.');
      return;
    }
    // --- Stylish Facebook message formatting ---
    function htmlToPlainText(html: string): string {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    }
    // Helper: convert to Unicode bold (Mathematical Bold)
    function toUnicodeBold(str: string): string {
      const offset = {
        upper: 0x1d400 - 0x41,
        lower: 0x1d41a - 0x61,
        digit: 0x1d7ce - 0x30
      };
      return str.split('').map(c => {
        if (c >= 'A' && c <= 'Z') return String.fromCodePoint(c.charCodeAt(0) + offset.upper);
        if (c >= 'a' && c <= 'z') return String.fromCodePoint(c.charCodeAt(0) + offset.lower);
        if (c >= '0' && c <= '9') return String.fromCodePoint(c.charCodeAt(0) + offset.digit);
        return c;
      }).join('');
    }
    let message = '';
    // Title in bold with emoji
    if (newsItem.title) message += '🎉 ' + toUnicodeBold(newsItem.title) + '\n';
    // Subtitle in italics (using underscores, Facebook renders as italics)
    if (newsItem.subtitle) message += '_' + newsItem.subtitle + '_' + '\n';
    // Content
    if (newsItem.content) {
      message += '\n' + htmlToPlainText(newsItem.content);
    } else if (newsItem.content) {
      message += '\n' + newsItem.content;
    }
    // Authors at the bottom, styled with separator and emoji
    if (newsItem.authors && Array.isArray(newsItem.authors) && newsItem.authors.length > 0) {
      message += '\n\n--------------\n';
      message += '👤 ' + newsItem.authors.map((a: IAuthors) => a.author).join(', ');
    }
    // console.log('Composed Facebook message:', message);
    this.info.set('Pubblicazione su Facebook in corso...');
    try {
      // Dynamically get page access token if not set or looks invalid
      if (!this.pageAccessToken || this.pageAccessToken.length < 10) {
        const userAccessToken = await this.facebookservice.loginWithPermissions();
        this.pageAccessToken = await this.facebookservice.getPageAccessToken(userAccessToken, this.pageId);
      }
      // Invia il messaggio completo come post
      const result = await this.facebookservice.postToPage(this.pageId, message, this.pageAccessToken);
      this.info.set('Pubblicazione su Facebook completata. Post ID: ' + (result.id || '[nessun ID]'));
      // Marca la notizia come pubblicata e salva la lista
      // Set uploadedOnFacebook true only for the posted news item, leave others unchanged
      this.homeblogtunnelservice.setNewsList(this.homeblogtunnelservice.getNewsList().map(n =>
        n.id === newsItem.id ? { ...n, uploadedOnFacebook: true } : n
      ));
      this.persistance.saveNewsList(this.homeblogtunnelservice.getNewsList());
    } catch (e: any) {
      this.errore.set('Errore durante la pubblicazione su Facebook: ' + (e?.message || e));
    }
  }

  /**
   * Custom handler for Quill editor creation event. Saves the editor instance for later use and adds a custom button to the toolbar.
   * Handles image deletion with Delete/Backspace keys.
   */
  onQuillEditorCreated(quill: any): void {
  // console.log('[onQuillEditorCreated] Quill instance created. pendingQuillHtml:', this.pendingQuillHtml());

    // (TEMPORARY) Removed clipboard matcher to test if Quill accepts complex HTML template

    // Store the Quill editor instance for later use
    this.quillEditorInstance.set(quill);
    (window as any).quillEditorInstance = quill;
    // Do NOT set the default template here. It is set in ngOnInit (on create) or editNews (on edit).

          // Initialize 360-degree draggable overlay if available
          if (typeof window.renderAbsoluteBlocks === 'function') {
            window.renderAbsoluteBlocks();
          }

          // (custom div blot registration removed)
          // Register the custom horizontal rule blot (safe to call multiple times)
          Blog.registerHrBlot();

          // Add a custom link button to the Quill toolbar
          const toolbar = quill.getModule('toolbar');
          if (toolbar) {
            toolbar.addHandler('customLink', () => this.openCustomLinkModal());
            const button = toolbar.container.querySelector('.ql-customLink');
            if (button) {
              button.innerHTML = '<span class="material-icons md-link"></span>';
            }
            // (customDiv toolbar handler and button removed)
            toolbar.addHandler('hr', () => {
              const range = quill.getSelection(true);
              if (range) {
                quill.insertEmbed(range.index, 'hr', true, 'user');
                quill.setSelection(range.index + 1, 0, 'user');
              }
            });
            const hrButton = toolbar.container.querySelector('.ql-hr');
            if (hrButton) {
              hrButton.innerHTML = '<span style="display:inline-block;width:18px;height:2px;background:#333;vertical-align:middle;"></span>';
            }
          }

    // (custom div edit button handler and MutationObserver removed)

    // Helper to set title attribute for all links in the editor
    function setLinkTitles() {
      const links = quill.root.querySelectorAll('a');
      links.forEach((a: HTMLAnchorElement) => {
        if (a.href && a.getAttribute('title') !== a.href) {
          a.setAttribute('title', a.href);
        }
      });
    }

    // Set titles initially and on every text change
    setLinkTitles();
    quill.on('text-change', setLinkTitles);

    // Enable cut, copy, paste, and undo (Ctrl+X, Ctrl+C, Ctrl+V, Ctrl+Z)
    quill.root.addEventListener('keydown', (event: KeyboardEvent) => {
      // Only handle if editor is focused
      if (!quill.hasFocus()) return;
      // Cut (Ctrl+X)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
        document.execCommand('cut');
        event.preventDefault();
      }
      // Copy (Ctrl+C)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        document.execCommand('copy');
        event.preventDefault();
      }
    });

    // Attempt to get the custom image manipulation module (if present)


    // Attempt to get the custom image manipulation module (if present)
    const imageManipulation = quill.getModule && quill.getModule('imageManipulation');

    // Add a keydown event listener to the Quill editor root to handle image deletion only (custom div logic removed)

    // Effect is now set up as a field initializer and will react automatically.
  }

  // Register a handler for the custom link button
  // Register custom Quill blot for horizontal rule (hr)
  private static registerHrBlot() {
    // Only register once
    if ((window as any)._hrBlotRegistered) return;
    const Quill = (window as any).Quill || (window as any).quill || undefined;
    if (!Quill) return;
    const BlockEmbed = Quill.import('blots/block/embed');
    class HrBlot extends BlockEmbed {
      static blotName = 'hr';
      static tagName = 'hr';
      static className = 'ql-hr';
      static create(value: any) {
        const node = super.create();
        node.setAttribute('contenteditable', 'false');
        node.classList.add('ql-hr');
        return node;
      }
      static value(node: any) {
        return undefined;
      }
    }
    Quill.register({ 'formats/hr': HrBlot });
    (window as any)._hrBlotRegistered = true;
  }

  // -----------------------------------------------------------------------

  // Quill editor event handler: keeps htmlContent signal in sync with editor
  onQuillContentChanged(event: any): void {
    // Only update signal if value actually changed (avoid loops)
    let html = event.html;
    // Normalize Quill empty content: treat null and <p><br></p> as empty string
    if (html === null || html === '<p><br></p>') {
      html = '';
    }
    // console.log('[onQuillContentChanged] Editor content changed', { html, text: event.text });
    if (this.isProgrammaticQuillUpdate()) {
      // console.log('[onQuillContentChanged] Skipping update due to programmatic change', { html });
      // console.log('[DEBUG] Skipping htmlContent.set due to programmatic Quill update.');
      return;
    }
    if (this.htmlContent() !== html) {
      this.htmlContent.set(html);
    }
  }

  // -----------------------------------------------------------------------
  // Persistence (save edited HTML back to the server)
  // -----------------------------------------------------------------------

  /**
   * Sends the current `htmlContent` signal value to the server via
   * `POST /api/component-html`, writing it back to the topic's HTML template
   * file on disk. Guards against accidental invocation when no topic context is set.
   */
  saveEditedHtml(): void {
    // Save the entire HTML as a news item (WYSIWYG)
    if (!this.htmlContent()) {
      console.warn('No content to save.');
      return;
    }

    // Sync htmlContent with the current editor value before saving
    const currentValue = this.editorControl.value ?? '';
    if (this.htmlContent() !== currentValue) {
      this.htmlContent.set(currentValue);
    }


    // Store the full HTML as a property of the news item
    const html = this.htmlContent();
    // console.log('Saving news item with HTML content', { html });
    let id = this.getFirstFreeId();
    let title = '';
    let subtitle = '';
    let date = '';
    let authors: IAuthors[] = [];
    let content = '';

    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Case 1: Card HTML (with .blog-card-title, etc.)
    const tit = Array.from(temp.querySelectorAll('h5'));
    // console.log('Extracted title from paragraph HTML input', { tit });
    if(tit.length>0) title = tit[0].textContent?.trim() || '';
    // console.log('Extracted title from paragraph HTML input', { title });
    // Case 2: Paragraph HTML (sequence of <p> tags, no card classes)
    const pTags = Array.from(temp.querySelectorAll('p'));
    if (pTags.length > 0) {
      const lines = pTags.map(p => p.textContent?.trim() || '').filter(l => l.length > 0);
      // console.log('Extracted lines from paragraph HTML input', { lines });
      // Now treat as plain text lines
      if (lines[0]) subtitle = lines[0];
      if (lines[1]) {
        const idText = lines[1].replace('#', '').trim();
        const parsedId = Number(idText);
        if (!isNaN(parsedId)) id = parsedId;
      }
      if (lines[2]) date = lines[2];
      // console.log('Extracted date from paragraph HTML input', { date }, lines[2]);
      if (lines[3]) {
        const authorsText = lines[3].replace('Authors:', '').trim();
        if (authorsText.length > 0) {
          authors = authorsText.split(',').map((a, index) => ({ id: index + 1, author: a.trim() }));
        } else {
          authors = [];
        }
      }
      if (lines[4]) {
        const contentText = lines[4].split('Content:')[1];
        content = contentText ? contentText.trim() : '';
      }
    }

    // Recreate the card HTML just before collecting news item fields
    const cardHtml = `
      <div class="blog-card card mb-4 shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h5 class="card-title mb-0 blog-card-title">${title}</h5>
              <p class="card-text text-muted mb-1 blog-card-subtitle">${subtitle}</p>
            </div>
            <span class="badge rounded-pill bg-gradient blog-badge">#${id}</span>
          </div>
          <div class="mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-calendar-event text-primary"></i>
            <small class="text-body-secondary">${date}</small>
          </div>
          <div class="mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-people text-primary"></i>
            <span class="fw-bold">Authors:</span>
            <span>${Array.isArray(authors) ? authors.map(a => a.author).join(', ') : ''}</span>
          </div>
          <div class="mb-2">
            <span class="fw-bold">Content:</span>
            <div class="card-text blog-card-content">${content}</div>
          </div>
        </div>
      </div>
    `;

    // Collect all relevant fields for the news item
    const newsItem = {
      id,
      title,
      subtitle,
      content,
      authors,
      date,
      htmlContent: cardHtml,
      uploadedOnFacebook: false
    };

    // console.log('Saving news item', newsItem);

    let defaultHtml = this.getDefaultHtmlContent();
    const updatedNewsList = [...this.homeblogtunnelservice.getNewsList()];
    // console.log(newsItem.id)
    const existingIndex = updatedNewsList.findIndex(n => n.id === newsItem.id);
    // console.log('Existing news list', this.homeblogtunnelservice.getNewsList(), { existingIndex, newsItem });
    if (existingIndex !== -1) {
      updatedNewsList[existingIndex] = newsItem;
    } else {
      updatedNewsList.push(newsItem);
      /*// Reset editor to the default template after saving
      const defaultHtml = this.getDefaultHtmlContent();
      this.htmlContent.set(defaultHtml);
      if (this.editorControl) {
        this.editorControl.setValue(defaultHtml, { emitEvent: false });
      }
      // If Quill editor instance is available, update its content too
      const quill = this.quillEditorInstance();
      if (quill) {
        quill.clipboard.dangerouslyPasteHTML(defaultHtml);
      }*/
    }
    this.homeblogtunnelservice.setNewsList(updatedNewsList);
    this.persistance.saveNewsList(this.homeblogtunnelservice.getNewsList());
  }

  /**
   * Opens the custom link modal and saves the current selection range from the Quill editor.
   * Allows inserting a link at the correct position after modal closes.
   */
  openCustomLinkModal() {
    // Get selected text from Quill editor and save selection
    const quill = this.quillEditorInstance();
    // If there's a selection, save it and extract the selected text for the modal
    let selected = '';
    if (quill) {
      const range = quill.getSelection();
      this.savedRange = range;
      if (range && range.length > 0) {
        selected = quill.getText(range.index, range.length);
      }
    } else {
      this.savedRange = null;
    }
    this.selectedLinkText.set(selected);
    this.showCustomLinkModal.set(true);
  }




  // --- Modal handlers for custom div block editing ---
  /**
   * Saves the edited content from the custom div modal back into the Quill editor.
   * @param content The HTML content to save into the custom div block.
   */

  /**
   * Inserts a custom link at the saved selection range in the Quill editor.
   * Handles both replacing selected text and inserting at cursor.
   */
  handleCustomLinkInsert = (url: string, text: string) => {
    this.showCustomLinkModal.set(false);
    const quill = this.quillEditorInstance();
    if (quill) {
      // Internal links (a path like "/blog", or a full URL of this site) are stored as a
      // relative path, so they keep working on any domain (localhost, Azure, custom domain).
      // Note: Quill only accepts http/https/mailto/tel/sms or relative URLs; anything else
      // (e.g. a custom "routerlink:" scheme) is replaced with about:blank.
      const isInternal = url.startsWith('/') || url.startsWith(environment.baseUrl + '/');
      const linkValue = isInternal ? url.replace(environment.baseUrl, '') : url;
      if (this.savedRange) {
        quill.setSelection(this.savedRange);
        if (this.savedRange.length > 0) {
          quill.deleteText(this.savedRange.index, this.savedRange.length);
        }
        quill.insertText(this.savedRange.index, text, 'link', linkValue);
      } else {
        const endIndex = quill.getLength();
        quill.insertText(endIndex, text, 'link', linkValue);
      }
    }
    this.savedRange = null;
  };

  /**
   * Closes the custom div modal without saving changes.
   */
}
