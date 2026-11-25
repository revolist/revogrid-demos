import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { mountForecast } from './forecast';

@Component({
  selector: 'category-forecast-demo',
  standalone: true,
  template: '<div #host class="forecast-host"></div>',
})
export class CategoryForecastComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private unmount?: () => void;

  ngAfterViewInit() {
    this.unmount = mountForecast(this.host.nativeElement);
  }

  ngOnDestroy() {
    this.unmount?.();
  }
}
