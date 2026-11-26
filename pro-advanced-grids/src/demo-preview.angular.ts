import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { mountAdvancedGrid } from './demo-entry';

@Component({ selector: 'advanced-grid-preview', standalone: true, template: '<div #host class="workbench-host"></div>' })
export class AdvancedGridPreviewComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) exampleId!: string;
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private dispose?: () => void;
  ngAfterViewInit() { this.dispose = mountAdvancedGrid(this.host.nativeElement, this.exampleId); }
  ngOnDestroy() { this.dispose?.(); }
}
