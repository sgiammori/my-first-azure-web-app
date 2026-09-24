import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

import Quill from 'quill';
(window as any).Quill = Quill;

// --- Register custom Quill ImageResize plugin (Quill 2.x) ---
// Import the plugin class directly from the JS file
// @ts-ignore: Allow importing JS class from non-module file
import { ImageManipulation } from './app/assets/quill-image-manipulation.js';

// Register the plugin if present
if (typeof ImageManipulation !== 'undefined') {
  Quill.register('modules/imageResize', ImageManipulation);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
