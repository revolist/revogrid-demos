import 'zone.js';
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { SimpleConstructionGanttComponent } from '../../pro-advanced-gantt/src/use-cases/simple-construction/simple-construction.angular';

export async function mount(parentSelector: string) {
  document.querySelector(parentSelector)!.innerHTML = '<simple-construction-gantt></simple-construction-gantt>';
  await bootstrapApplication(SimpleConstructionGanttComponent);
}
