import type { AuditHistoryConfig, CellFlashConfig } from '@revolist/revogrid-pro';

declare global {
  interface HTMLRevoGridElement {
    auditHistory?: AuditHistoryConfig;
    cellFlash?: CellFlashConfig;
  }
}

declare module '@revolist/revogrid' {
  namespace Components {
    interface RevoGrid {
      auditHistory?: AuditHistoryConfig;
      cellFlash?: CellFlashConfig;
    }
  }

  namespace JSX {
    interface RevoGrid {
      auditHistory?: AuditHistoryConfig;
      cellFlash?: CellFlashConfig;
    }
  }
}

export {};
