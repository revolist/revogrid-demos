import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { mountImportDemo } from './import-demo';

@Component({ selector: 'pivot-import-demo', standalone: true, encapsulation: ViewEncapsulation.None, template: '<div #host class="pivot-import-embed"></div>' })
export class ImportDemoAngular implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private cleanup?: () => void;
  ngAfterViewInit() { this.cleanup = mountImportDemo(this.host.nativeElement); }
  ngOnDestroy() { this.cleanup?.(); }
}
