import React from 'react';
import { createRoot } from 'react-dom/client';
import Demo from '../../pro-advanced-gantt/src/use-cases/simple-construction/simple-construction.react';

export function mount(parentSelector: string) {
  createRoot(document.querySelector(parentSelector)!).render(<Demo />);
}
