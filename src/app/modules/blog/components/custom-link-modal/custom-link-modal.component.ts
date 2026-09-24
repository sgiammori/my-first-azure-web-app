import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-custom-link-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-link-modal.component.html',
  styleUrl: './custom-link-modal.component.css'
})

export class CustomLinkModalComponent implements OnInit, OnChanges {
confirm() {
throw new Error('Method not implemented.');
}
  newPostTopicId: number | null = null;
  newPostCategoryId: number | null = null;
  newTopicCategoryId: number | null = null;

  @Input() defaultTopicId: number | null = null;
  @Input() defaultCategoryId: number | null = null;
  selectedType: string = 'external';

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  @Input() show = false;
  @Input() onSelect: (url: string, text: string) => void = () => {};
  @Input() linkText = '';
  @Output() close = new EventEmitter<void>();

  externalUrl: string = '';
  selectedId: string | null = null;

  insertDisabled(): boolean {
    if (this.selectedType === 'external') {
      return !this.externalUrl || !this.linkText;
    }
    if (this.selectedId === 'add_new') {
      if (this.selectedType === 'post') {
        return !this.linkText;
      }
    }
    return !this.selectedId || !this.linkText;
  }

  onTypeChange() {
    this.selectedId = null;
    this.externalUrl = '';
  }

  handleDropdownChange(event: any) {
    // Reset dependent fields when switching to 'add_new'
    if (this.selectedId === 'add_new') {
      if (this.selectedType === 'post') {
        this.newPostTopicId = null;
        this.newPostCategoryId = null;
      }
      if (this.selectedType === 'topic') {
        this.newTopicCategoryId = null;
      }
    }
  }

  handleClose() {
    this.close.emit();
  }
}


