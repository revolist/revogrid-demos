import arrowRotateLeftIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-rotate-left.svg?raw';
import arrowRotateRightIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-rotate-right.svg?raw';
import boltIcon from '@fortawesome/fontawesome-free/svgs/solid/bolt.svg?raw';
import copyIcon from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?raw';
import fileCirclePlusIcon from '@fortawesome/fontawesome-free/svgs/solid/file-circle-plus.svg?raw';
import fileExportIcon from '@fortawesome/fontawesome-free/svgs/solid/file-export.svg?raw';
import magnifyingGlassIcon from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw';
import tableColumnsIcon from '@fortawesome/fontawesome-free/svgs/solid/table-columns.svg?raw';
import wandMagicSparklesIcon from '@fortawesome/fontawesome-free/svgs/solid/wand-magic-sparkles.svg?raw';
import xmarkIcon from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?raw';

export const SPREADSHEET_ACTION_ICONS = {
  newWorkbook: fileCirclePlusIcon,
  export: fileExportIcon,
  undo: arrowRotateLeftIcon,
  redo: arrowRotateRightIcon,
  smartFill: wandMagicSparklesIcon,
  copyPreview: copyIcon,
  freeze: tableColumnsIcon,
  flash: boltIcon,
  find: magnifyingGlassIcon,
  clear: xmarkIcon,
} as const;
