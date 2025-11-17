/**
 * Column resolution utility for flexible field mapping
 *
 * Provides pure functions to resolve Excel column names to indices using aliases.
 * Supports configurable field mappings without hardcoded column positions.
 */

/**
 * Result of successful column resolution
 */
export interface ColumnResolutionResult {
  /** Zero-based column index */
  index: number;
  /** The alias that matched in the headers */
  matchedAlias: string;
}

/**
 * Resolve a column by searching for any of its aliases in headers
 *
 * @param headers - Excel column headers array
 * @param aliases - List of acceptable column names to search for
 * @param fieldName - Logical field name (for error messages)
 * @param required - Whether this field must be found
 * @returns Column resolution result, or null if not found and not required
 * @throws Error if required field is not found (includes attempted aliases and available columns)
 *
 * @example
 * ```typescript
 * const headers = ['订单号', '供应单位名称', '单体工程名称'];
 * const result = resolveColumn(headers, ['供应单位名称'], 'supplier', true);
 * // Returns: { index: 1, matchedAlias: '供应单位名称' }
 * ```
 */
export function resolveColumn(
  headers: string[],
  aliases: string[],
  fieldName: string,
  required: boolean
): ColumnResolutionResult | null {
  // Search for first matching alias
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index !== -1) {
      return { index, matchedAlias: alias };
    }
  }

  // Not found - handle based on required flag
  if (required) {
    const availableColumns =
      headers.length <= 10
        ? headers.join(', ')
        : `${headers.slice(0, 10).join(', ')}, ... (${headers.length} total)`;

    throw new Error(
      `Required field "${fieldName}" not found in Excel columns.\n` +
        `  Attempted aliases: [${aliases.map((a) => `"${a}"`).join(', ')}]\n` +
        `  Available columns: ${availableColumns}\n\n` +
        `Hint: Update configs/vX.Y.Z/<sha>/label_alias.json with the correct column name.`
    );
  }

  return null;
}

/**
 * Resolve all indexed fields (supplier, project, order) in batch
 *
 * @param headers - Excel column headers array
 * @param dbColumnNames - DB column aliases from config
 * @returns Map of resolved column indices
 * @throws Error if any required field (supplier, project) is missing
 *
 * @example
 * ```typescript
 * const headers = ['订单号', '供应单位名称', '单体工程名称'];
 * const dbColumnNames = {
 *   supplier: ['供应单位名称'],
 *   project: ['单体工程名称'],
 *   order: ['订单号', '订号']
 * };
 * const result = resolveIndexedColumns(headers, dbColumnNames);
 * // Returns: { supplierIdx: 1, projectIdx: 2, orderIdx: 0 }
 * ```
 */
export function resolveIndexedColumns(
  headers: string[],
  dbColumnNames: {
    supplier: string[];
    project: string[];
    order?: string[];
  }
): {
  supplierIdx: number;
  projectIdx: number;
  orderIdx: number | null;
} {
  // Resolve required fields
  const supplierResult = resolveColumn(
    headers,
    dbColumnNames.supplier,
    'supplier',
    true
  );
  const projectResult = resolveColumn(
    headers,
    dbColumnNames.project,
    'project',
    true
  );

  // Resolve optional order field
  const orderResult = dbColumnNames.order
    ? resolveColumn(headers, dbColumnNames.order, 'order', false)
    : null;

  return {
    supplierIdx: supplierResult!.index,
    projectIdx: projectResult!.index,
    orderIdx: orderResult?.index ?? null,
  };
}
