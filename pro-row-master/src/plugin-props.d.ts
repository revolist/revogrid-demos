import type { RowMasterConfig, TreeConfig } from '@revolist/revogrid-pro';

declare global {
  interface HTMLRevoGridElement {
    masterRow?: RowMasterConfig;
    tree?: TreeConfig;
  }
}

declare module '@revolist/revogrid' {
  namespace Components {
    interface RevoGrid {
      masterRow?: RowMasterConfig;
      tree?: TreeConfig;
    }
  }

  namespace JSX {
    interface RevoGrid {
      masterRow?: RowMasterConfig;
      tree?: TreeConfig;
    }
  }
}

export {};
