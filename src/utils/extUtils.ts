import { $config, $state } from 'src/extension';
import { languages, type Diagnostic, type Uri } from 'vscode';

/**
 * Usually documentation website Uri.
 */
function getDiagnosticTarget(diagnostic: Diagnostic): Uri | false | undefined {
	return typeof diagnostic.code !== 'number' && typeof diagnostic.code !== 'string' && diagnostic.code?.target;
}

function getDiagnosticCode(diagnostic: Diagnostic): string | undefined {
	const code = typeof diagnostic.code === 'string' || typeof diagnostic.code === 'number' ? diagnostic.code :	diagnostic.code?.value;
	if (code === undefined) {
		return undefined;
	}
	return String(code);
}

/**
 * Take strings like:
 * - `eslint`
 * - `eslint(padded-blocks)`
 * and return { source: 'eslint', code: 'padded-blocks' }
 */
function parseSourceCodeFromString(str: string): { source?: string; code?: string } {
	const sourceCodeMatch = /(?<source>[^()]+)(?:\((?<code>.+)\))?/u.exec(str);
	const source = sourceCodeMatch?.groups?.source;
	const code = sourceCodeMatch?.groups?.code;
	return {
		source,
		code,
	};
}
function diagnosticToSourceCodeString(source: string, code?: string): string {
	return `${source}${code ? `(${code})` : ''}`;
}

export type GroupedByLineDiagnostics = Record<string, Diagnostic[]>;
/**
 * Return diagnostics grouped by line: `Record<string, Diagnostic[]>`
 */
function groupDiagnosticsByLine(diagnostics: Diagnostic[]): GroupedByLineDiagnostics {
	const groupedDiagnostics: GroupedByLineDiagnostics = {};
	for (const diagnostic of diagnostics) {
		if (shouldExcludeDiagnostic(diagnostic)) {
			continue;
		}

		const key = diagnostic.range.start.line;

		if (groupedDiagnostics[key]) {
			groupedDiagnostics[key].push(diagnostic);
		} else {
			groupedDiagnostics[key] = [diagnostic];
		}
	}
	return groupedDiagnostics;
}
/**
 * Check multiple exclude sources if the diagnostic should not be shown.
 */
function shouldExcludeDiagnostic(diagnostic: Diagnostic): boolean {
	if (diagnostic.source) {
		for (const excludeSourceCode of $state.excludeSources) {
			if (excludeSourceCode.source === diagnostic.source) {
				let diagnosticCode = '';
				if (typeof diagnostic.code === 'number') {
					diagnosticCode = String(diagnostic.code);
				} else if (typeof diagnostic.code === 'string') {
					diagnosticCode = diagnostic.code;
				} else if (diagnostic.code?.value) {
					diagnosticCode = String(diagnostic.code.value);
				}
				if (!excludeSourceCode.code) {
					// only source exclusion
					return true;
				}
				if (excludeSourceCode.code && diagnosticCode && excludeSourceCode.code === diagnosticCode) {
					// source and code matches
					return true;
				}
			}
		}
	}

	for (const regex of $state.excludeRegexp) {
		if (regex.test(diagnostic.message)) {
			return true;
		}
	}

	return false;
}
/**
 * `true` when diagnostic enabled in config & in temp variable
 */
function isSeverityEnabled(severity: number): boolean {
	return (
		(severity === 0 && $state.configErrorEnabled) ||
		(severity === 1 && $state.configWarningEnabled) ||
		(severity === 2 && $state.configInfoEnabled) ||
		(severity === 3 && $state.configHintEnabled)
	);
}

/**
 * Generate inline message from template.
 */
function diagnosticToInlineMessage(template: string, diagnostic: Diagnostic, count: number): string {
	/** Variables to replace inside the `messageTemplate` & `statusBarMessageTemplate` settings. */
	const enum TemplateVars {
		Message = '$message',
		Source = '$source',
		Code = '$code',
		Count = '$count',
		Severity = '$severity',
	}
	let message = diagnostic.message;
	if ($state.replaceRegexp) {
		// Apply transformations sequentially, checking at each stage if the updated
		// message matches the next checker. Usuaully there would only be one match,
		// but this ensures individual matchers can transform parts in sequence.
		for (const transformation of $state.replaceRegexp) {
			const matchResult = transformation.matcher.exec(message);
			if (matchResult) {
				message = transformation.message;
				// Replace groups like $0 and $1 with groups from the match
				for (let groupIndex = 0; groupIndex < matchResult.length; groupIndex++) {
					message = message.replace(new RegExp(`\\$${groupIndex}`, 'gu'), matchResult[Number(groupIndex)]);
				}
				break;
			}
		}
	}

	if (template === TemplateVars.Message) {
		// When default template - no need to use RegExps or other stuff.
		return message;
	} else {
		// Message & severity is always present.
		let result = template
			.replace(TemplateVars.Message, message)
			.replace(TemplateVars.Severity, $config.severityText[diagnostic.severity] || '');
		/**
		 * Count, source & code can be absent.
		 * If present - replace them as simple string.
		 * If absent - replace by RegExp removing all adjacent non-whitespace symbols with them.
		 */

		/* eslint-disable prefer-named-capture-group, max-params */
		if (template.includes(TemplateVars.Count)) {
			if (count > 1) {
				result = result.replace(TemplateVars.Count, String(count));
			} else {
				// no `$count` in the template - remove it
				result = result.replace(/(\s*?)?(\S*?)?(\$count)(\S*?)?(\s*?)?/u, (match, g1: string | undefined, g2, g3, g4, g5: string | undefined) => (g1 ?? '') + (g5 ?? ''));
			}
		}
		if (template.includes(TemplateVars.Source)) {
			if (diagnostic.source) {
				result = result.replace(TemplateVars.Source, String(diagnostic.source));
			} else {
				result = result.replace(/(\s*?)?(\S*?)?(\$source)(\S*?)?(\s*?)?/u, (match, g1: string | undefined, g2, g3, g4, g5: string | undefined) => (g1 ?? '') + (g5 ?? ''));
			}
		}

		if (template.includes(TemplateVars.Code)) {
			const code = typeof diagnostic.code === 'object' ? String(diagnostic.code.value) : String(diagnostic.code);
			if (diagnostic.code) {
				result = result.replace(TemplateVars.Code, code);
			} else {
				result = result.replace(/(\s*?)?(\S*?)?(\$code)(\S*?)?(\s*?)?/u, (match, g1: string | undefined, g2, g3, g4, g5: string | undefined) => (g1 ?? '') + (g5 ?? ''));
			}
		}
		/* eslint-enable prefer-named-capture-group, max-params */

		return result;
	}
}

function getDiagnosticAtLine(uri: Uri, lineNumber: number): Diagnostic | undefined {
	const diagnostics = languages.getDiagnostics(uri);
	const groupedDiagnostics = extUtils.groupDiagnosticsByLine(diagnostics);
	const diagnosticsAtLineNumber = groupedDiagnostics[lineNumber];
	if (!diagnosticsAtLineNumber) {
		return;
	}
	diagnosticsAtLineNumber.sort((a, b) => a.severity - b.severity);
	return diagnosticsAtLineNumber[0];
}

export const extUtils = {
	getDiagnosticTarget,
	getDiagnosticCode,
	parseSourceCodeFromString,
	diagnosticToSourceCodeString,
	groupDiagnosticsByLine,
	shouldExcludeDiagnostic,
	isSeverityEnabled,
	diagnosticToInlineMessage,
	getDiagnosticAtLine,
};
