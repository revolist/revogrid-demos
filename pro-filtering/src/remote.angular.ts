import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { mountRemoteFilteringRecipe } from './remote.shared';

@Component({
  selector: 'remote-filtering-grid',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: '<div #root class="remote-filter-recipe"></div>',
})
export class RemoteFilteringGridComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root') root?: ElementRef<HTMLElement>;
  private cleanup?: () => void;
  ngAfterViewInit() {
    if (this.root) this.cleanup = mountRemoteFilteringRecipe(this.root.nativeElement);
  }
  ngOnDestroy() { this.cleanup?.(); }
}
