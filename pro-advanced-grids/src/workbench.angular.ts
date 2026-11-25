import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { mountWorkbench } from './workbench';

@Component({
  selector: 'advanced-grids-demo',
  standalone: true,
  template: '<div #host class="workbench-host"></div>',
})
export class AdvancedGridsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private unmount?: () => void;

  ngAfterViewInit() {
    this.unmount = mountWorkbench(this.host.nativeElement);
  }

  ngOnDestroy() {
    this.unmount?.();
  }
}
