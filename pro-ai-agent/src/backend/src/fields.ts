import { createAiViewFields, type AiViewField } from '@revolist/revogrid-pro';
import {
  aiDemoColumnPresets,
  aiViewColumns,
  aiViewFields,
  aiViewFieldHints,
} from '../../AiAssistant.data';

/** Browser field IDs select server-authored metadata; they never replace its policy. */
export function resolveReferenceFields(input: unknown): AiViewField[] {
  if (input === undefined) return structuredClone(aiViewFields);
  if (!Array.isArray(input) || input.length > 1000)
    throw new Error('Invalid reference fields.');
  const approved = createAiViewFields(
    [...aiViewColumns, ...aiDemoColumnPresets.map((preset) => preset.column)],
    { overrides: aiViewFieldHints },
  );
  const selected = new Set<string | number>();
  return input.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidates = approved.filter((field) => field.field === item.field);
    if (!candidates.length) return [];
    if (selected.has(item.field))
      throw new Error('Duplicate reference fields.');
    selected.add(item.field);
    // A preset may rename a known field, but arbitrary browser labels are ignored.
    return [
      structuredClone(
        candidates.find((field) => field.label === item.label) ?? candidates[0],
      ),
    ];
  });
}
