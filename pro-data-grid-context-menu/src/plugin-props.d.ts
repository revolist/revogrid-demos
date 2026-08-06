import type { DataGridContextMenuConfig } from '@revolist/revogrid-pro';

declare global {
  interface HTMLRevoGridElement {
    dataGridContextMenu?: false | DataGridContextMenuConfig;
  }
}

declare module '@revolist/revogrid' {
  namespace Components {
    interface RevoGrid {
      dataGridContextMenu?: false | DataGridContextMenuConfig;
    }
  }

  namespace JSX {
    interface RevoGrid {
      dataGridContextMenu?: false | DataGridContextMenuConfig;
    }
  }
}

export {};
