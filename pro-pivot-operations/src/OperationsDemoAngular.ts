import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { mountOperationsDemo } from './operations-demo';
@Component({ selector: 'pivot-operations-demo', standalone: true, encapsulation: ViewEncapsulation.None, template: '<div #host class="pivot-operations-embed"></div>' })
export class OperationsDemoAngular implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private cleanup?: () => void;
  ngAfterViewInit() { this.cleanup = mountOperationsDemo(this.host.nativeElement); }
  ngOnDestroy() { this.cleanup?.(); }
}
