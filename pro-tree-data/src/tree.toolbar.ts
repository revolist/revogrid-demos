import { h as preactH } from 'preact';
import { ButtonGroup, IconButton, Switch } from '@revolist/ui/preact';
import { renderPreactInto } from '@revolist/ui/preact-mount';
import expandIcon from '@fortawesome/fontawesome-free/svgs/solid/angles-down.svg?raw';
import collapseIcon from '@fortawesome/fontawesome-free/svgs/solid/angles-up.svg?raw';
import excelIcon from '@fortawesome/fontawesome-free/svgs/solid/file-excel.svg?raw';

interface TreeToolbarActions {
  expandAll: () => void;
  collapseAll: () => void;
  exportToExcel: () => Promise<void>;
  setStickyParents: (checked: boolean) => void;
}

function TreeToolbar(actions: TreeToolbarActions, state: { exporting: boolean; stickyParents: boolean }, update: () => void) {
  const { exporting, stickyParents } = state;

  async function exportToExcel() {
    state.exporting = true;
    update();
    try {
      await actions.exportToExcel();
    } finally {
      state.exporting = false;
      update();
    }
  }

  return preactH('div', { class: 'tree-toolbar' },
    preactH(ButtonGroup, { label: 'Tree actions', className: 'tree-toolbar__actions' },
      preactH(IconButton, { label: 'Expand all', icon: expandIcon, onClick: actions.expandAll }),
      preactH(IconButton, { label: 'Collapse all', icon: collapseIcon, onClick: actions.collapseAll }),
      preactH(IconButton, {
        label: exporting ? 'Exporting…' : 'Export to Excel',
        icon: excelIcon,
        disabled: exporting,
        onClick: exportToExcel,
      }),
    ),
    preactH(Switch, {
      label: 'Sticky parents',
      checked: stickyParents,
      onChange(checked: boolean) {
        state.stickyParents = checked;
        update();
        actions.state.stickyParents = checked;
        update();
      },
    }),
  );
}

export function mountTreeToolbar(host: HTMLElement, actions: TreeToolbarActions) {
  const state = { exporting: false, stickyParents: true };
  const update = () => renderPreactInto(host, TreeToolbar(actions, state, update));
  update();
  return () => renderPreactInto(host, null);
}
