import { regEx } from '../../../util/regex.ts';
import type { UpdateDependencyConfig } from '../types.ts';

export function updateDependency({
  fileContent,
  upgrade,
}: UpdateDependencyConfig): string | null {
  const { depName, currentValue, newValue, replaceString } = upgrade;
  if (!newValue) {
    return fileContent;
  }

  if (replaceString && fileContent.includes(replaceString)) {
    let updatedItem: string;
    if (currentValue && replaceString.includes(currentValue)) {
      // Preserve comparison operator if newValue doesn't specify one
      const opMatch = regEx('^(?<op>[><=!~^&]+\\s*)').exec(currentValue);
      if (opMatch?.groups?.op && !regEx('^[><=!~^&]').test(newValue)) {
        updatedItem = replaceString.replace(
          currentValue,
          `${opMatch.groups.op}${newValue}`,
        );
      } else {
        updatedItem = replaceString.replace(currentValue, newValue);
      }
    } else {
      updatedItem = `${depName} >= ${newValue}`;
    }

    const lines = fileContent.split(regEx('\\r?\\n'));
    let replaced = false;
    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (
        !replaced &&
        !trimmed.startsWith('#') &&
        line.includes(replaceString)
      ) {
        replaced = true;
        return line.replace(replaceString, updatedItem);
      }
      return line;
    });

    if (replaced) {
      return newLines.join('\n');
    }

    return fileContent.replace(replaceString, updatedItem);
  }

  // Fallback: line replacement matching quoted package declaration
  const fallbackRegex = regEx(
    `(?<quote>["'])${depName}(?<rest>\\s+[^"']*)?\\k<quote>`,
    'g',
  );
  return fileContent.replace(
    fallbackRegex,
    `$<quote>${depName} >= ${newValue}$<quote>`,
  );
}
