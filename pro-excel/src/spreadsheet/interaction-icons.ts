import arrowDownIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-down.svg?raw';
import arrowDownZAIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-down-z-a.svg?raw';
import arrowRotateLeftIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-rotate-left.svg?raw';
import arrowRotateRightIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-rotate-right.svg?raw';
import arrowUpIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-up.svg?raw';
import arrowUpAZIcon from '@fortawesome/fontawesome-free/svgs/solid/arrow-up-a-z.svg?raw';
import boltIcon from '@fortawesome/fontawesome-free/svgs/solid/bolt.svg?raw';
import borderAllIcon from '@fortawesome/fontawesome-free/svgs/solid/border-all.svg?raw';
import broomIcon from '@fortawesome/fontawesome-free/svgs/solid/broom.svg?raw';
import copyIcon from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?raw';
import eraserIcon from '@fortawesome/fontawesome-free/svgs/solid/eraser.svg?raw';
import eyeSlashIcon from '@fortawesome/fontawesome-free/svgs/solid/eye-slash.svg?raw';
import filterIcon from '@fortawesome/fontawesome-free/svgs/solid/filter.svg?raw';
import fileCirclePlusIcon from '@fortawesome/fontawesome-free/svgs/solid/file-circle-plus.svg?raw';
import fileExportIcon from '@fortawesome/fontawesome-free/svgs/solid/file-export.svg?raw';
import magnifyingGlassIcon from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw';
import paintbrushIcon from '@fortawesome/fontawesome-free/svgs/solid/paintbrush.svg?raw';
import pasteIcon from '@fortawesome/fontawesome-free/svgs/solid/paste.svg?raw';
import scissorsIcon from '@fortawesome/fontawesome-free/svgs/solid/scissors.svg?raw';
import tableColumnsIcon from '@fortawesome/fontawesome-free/svgs/solid/table-columns.svg?raw';
import thumbtackIcon from '@fortawesome/fontawesome-free/svgs/solid/thumbtack.svg?raw';
import trashIcon from '@fortawesome/fontawesome-free/svgs/solid/trash.svg?raw';
import wandMagicSparklesIcon from '@fortawesome/fontawesome-free/svgs/solid/wand-magic-sparkles.svg?raw';
import xmarkIcon from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?raw';

export {
  arrowDownIcon,
  arrowDownZAIcon,
  arrowUpIcon,
  arrowUpAZIcon,
  borderAllIcon,
  broomIcon,
  copyIcon,
  eraserIcon,
  eyeSlashIcon,
  filterIcon,
  pasteIcon,
  scissorsIcon,
  tableColumnsIcon,
  thumbtackIcon,
  trashIcon,
};

export const SPREADSHEET_ACTION_ICONS = {
  newWorkbook: fileCirclePlusIcon,
  export: fileExportIcon,
  format: paintbrushIcon,
  undo: arrowRotateLeftIcon,
  redo: arrowRotateRightIcon,
  smartFill: wandMagicSparklesIcon,
  copyPreview: copyIcon,
  freeze: tableColumnsIcon,
  flash: boltIcon,
  find: magnifyingGlassIcon,
  clear: xmarkIcon,
} as const;
