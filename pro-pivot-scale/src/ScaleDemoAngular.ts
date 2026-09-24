import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { mountScaleDemo } from './scale-demo';

@Component({ selector: 'pivot-scale-demo', standalone: true, encapsulation: ViewEncapsulation.None, template: '<div #host class="pivot-scale-embed"></div>' })
export class ScaleDemoAngular implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private cleanup?: () => void;
  ngAfterViewInit() { this.cleanup = mountScaleDemo(this.host.nativeElement); }
  ngOnDestroy() { this.cleanup?.(); }
}
