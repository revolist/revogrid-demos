import undoIcon from '@fortawesome/fontawesome-free/svgs/solid/rotate-left.svg?raw';
import redoIcon from '@fortawesome/fontawesome-free/svgs/solid/rotate-right.svg?raw';
import boltIcon from '@fortawesome/fontawesome-free/svgs/solid/bolt.svg?raw';
import copyIcon from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?raw';
import fileCirclePlusIcon from '@fortawesome/fontawesome-free/svgs/solid/file-circle-plus.svg?raw';
import downloadIcon from '@fortawesome/fontawesome-free/svgs/solid/download.svg?raw';
import magnifyingGlassIcon from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw';
import wandMagicSparklesIcon from '@fortawesome/fontawesome-free/svgs/solid/wand-magic-sparkles.svg?raw';
import xmarkIcon from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?raw';

export const SPREADSHEET_ACTION_ICONS = {
  newWorkbook: fileCirclePlusIcon,
  export: downloadIcon,
  undo: undoIcon,
  redo: redoIcon,
  smartFill: wandMagicSparklesIcon,
  copyPreview: copyIcon,
  flash: boltIcon,
  find: magnifyingGlassIcon,
  clear: xmarkIcon,
} as const;
