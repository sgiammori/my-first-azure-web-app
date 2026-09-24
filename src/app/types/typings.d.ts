declare module 'quill-image-resize';
declare module 'quill-image-uploader2';
declare global {
  interface Window {
    makeDivsDraggableInQuill?: (...args: any[]) => void;
    setupQuillAbsoluteBlocksObserver?: (...args: any[]) => void;
    // add other custom properties as needed
  }
}
export {};
