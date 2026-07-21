/** Formula tokenization and syntax-overlay lifecycle helpers. */
import type {
  SpreadsheetFormulaToken,
  SpreadsheetFormulaTokenType,
} from './models';

const SPREADSHEET_FORMULA_TOKEN_PATTERN = /("(?:[^"]|"")*"|'(?:[^']|'')*'|\$?[A-Za-z]{1,3}\$?[1-9][0-9]*(?::\$?[A-Za-z]{1,3}\$?[1-9][0-9]*)?|[A-Za-z_\\][A-Za-z0-9_.\\]*(?=\s*\()|[A-Za-z_\\][A-Za-z0-9_.\\]*|\d+(?:\.\d+)?%?|[+\-*/^&=<>]+|[(),:])/g;

/** Tokenizes formula text without evaluating or rewriting the expression. */
export function tokenizeSpreadsheetFormula(value: string): SpreadsheetFormulaToken[] {
  if (!value) {
    return [];
  }

  const tokens: SpreadsheetFormulaToken[] = [];
  let index = 0;
  for (const match of value.matchAll(SPREADSHEET_FORMULA_TOKEN_PATTERN)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > index) {
      tokens.push({ type: 'plain', value: value.slice(index, start) });
    }
    tokens.push({ type: getSpreadsheetFormulaTokenType(token, value, start + token.length), value: token });
    index = start + token.length;
  }
  if (index < value.length) {
    tokens.push({ type: 'plain', value: value.slice(index) });
  }
  return tokens;
}

/**
 * Mirrors a FormulaBarPlugin-owned input into a read-only syntax overlay.
 * Returns a cleanup callback that removes every listener installed here.
 */
export function installSpreadsheetFormulaEditorHighlight(
  input: HTMLInputElement,
  overlay: HTMLElement,
  grid?: HTMLRevoGridElement | null,
) {
  // Keep a read-only syntax overlay in sync with the native input so selection,
  // keyboard editing, and FormulaBarPlugin ownership stay unchanged.
  const render = () => {
    renderSpreadsheetFormulaHighlight(overlay, input.value);
    overlay.parentElement?.classList.toggle('is-readonly', input.disabled);
  };
  const onFormulaBarChange = () => {
    window.requestAnimationFrame(render);
  };

  input.addEventListener('input', render);
  input.addEventListener('change', render);
  grid?.addEventListener('formulabarchange', onFormulaBarChange);
  window.requestAnimationFrame(render);

  return () => {
    input.removeEventListener('input', render);
    input.removeEventListener('change', render);
    grid?.removeEventListener('formulabarchange', onFormulaBarChange);
  };
}

function renderSpreadsheetFormulaHighlight(overlay: HTMLElement, value: string) {
  overlay.replaceChildren(...tokenizeSpreadsheetFormula(value).map((token) => {
    const span = document.createElement('span');
    span.className = `spreadsheet-formula-token spreadsheet-formula-token-${token.type}`;
    span.textContent = token.value;
    return span;
  }));
}

function getSpreadsheetFormulaTokenType(token: string, source: string, endIndex: number): SpreadsheetFormulaTokenType {
  if (/^["']/.test(token)) {
    return 'string';
  }
  if (/^\$?[A-Za-z]{1,3}\$?[1-9][0-9]*(?::\$?[A-Za-z]{1,3}\$?[1-9][0-9]*)?$/.test(token)) {
    return 'reference';
  }
  if (/^\d/.test(token)) {
    return 'number';
  }
  if (/^[+\-*/^&=<>]+$/.test(token)) {
    return 'operator';
  }
  if (/^[(),:]$/.test(token)) {
    return 'punctuation';
  }
  if (/^[A-Za-z_\\][A-Za-z0-9_.\\]*$/.test(token)) {
    return source.slice(endIndex).trimStart().startsWith('(') ? 'function' : 'name';
  }
  return 'plain';
}
