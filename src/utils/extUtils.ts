import { $config, $state } from 'src/extension';
import { type DiagnosticTarget } from 'src/types';
import { utils } from 'src/utils/utils';
import { languages, window, type Diagnostic, type TextEditor, type TextLine, type Uri } from 'vscode';

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
 *
 * Also, excludes diagnostics according to `errorLens.excludeSources` & `errorLens.exclude` settings.
 *
 * Also, sorts the problems in every line by severity err>warn>info>hint.
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

	// Apply sorting err>warn>info>hint
	for (const key in groupedDiagnostics) {
		groupedDiagnostics[key] = groupedDiagnostics[key].sort((diag1, diag2) => diag1.severity - diag2.severity);
	}

	return groupedDiagnostics;
}
/**
 * Check multiple exclude sources if the diagnostic should not be shown.
 */
function shouldExcludeDiagnostic(diagnostic: Diagnostic): boolean {
	if (!isSeverityEnabled(diagnostic.severity)) {
		return true;
	}

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

interface PrepareMessageArg {
	template: string;
	diagnostic: Diagnostic;
	lineProblemCount: number;
	removeLinebreaks: boolean;
	replaceLinebreaksSymbol: string;
}
/**
 * Apply extension settings (`errorLens.messageTemplate`, `errorLens.messageMaxChars`, `errorLens.removeLinebreaks`) to diagnostic message.
 *
 * If the message has thousands of characters - VSCode will render all of them offscreen and the editor will freeze.
 * If the message has linebreaks - it will cut off the message in that place.
 */
function prepareMessage({ template, diagnostic, lineProblemCount, removeLinebreaks, replaceLinebreaksSymbol }: PrepareMessageArg): string {
	const templated = diagnosticToInlineMessage(template, diagnostic, lineProblemCount);
	return utils.truncateString(removeLinebreaks ? utils.replaceLinebreaks(templated, replaceLinebreaksSymbol) : templated, $config.messageMaxChars);
}
/**
 * Get all diagnostics from (all/visibleEditors/activeEditor).
 */
function getDiagnostics(arg?: { target: DiagnosticTarget }): [Uri, Diagnostic[]][] {
	const allDiagnostics = languages.getDiagnostics();

	if (arg === undefined || arg.target === 'all') {
		return allDiagnostics;
	}

	if (arg.target === 'activeEditor') {
		return allDiagnostics.filter(diag => diag[0].toString(true) === window.activeTextEditor?.document.uri.toString(true));
	} else if (arg.target === 'visibleEditors') {
		const visibleUriWithDiagnostics = [];
		for (const diag of allDiagnostics) {
			for (const visibleEditor of window.visibleTextEditors) {
				if (visibleEditor.document.uri.toString(true) === diag[0].toString(true)) {
					visibleUriWithDiagnostics.push(diag);
				}
			}
		}
		return visibleUriWithDiagnostics;
	}

	return [];
}

function getDiagnosticAtLine(uri: Uri, lineNumber: number): Diagnostic | undefined {
	const diagnostics = languages.getDiagnostics(uri);
	const groupedDiagnostics = extUtils.groupDiagnosticsByLine(diagnostics);
	const diagnosticsAtLineNumber = groupedDiagnostics[lineNumber];
	if (!diagnosticsAtLineNumber) {
		return;
	}
	return diagnosticsAtLineNumber[0];
}
/**
 * Get closest to the active cursor diagnostic.
 *
 * TODO: duplicates code in `statusBarMessage.ts`
 */
function getClosestDiagnostic(editor: TextEditor): Diagnostic | undefined {
	const groupedDiagnostics = groupDiagnosticsByLine(languages.getDiagnostics(editor.document.uri));
	const lineNumberKeys = Object.keys(groupedDiagnostics);
	const activeLineNumber = editor.selection.active.line;

	// Sort by how close it is to the cursor
	const sortedLineNumbers = lineNumberKeys.map(Number).sort((ln1, ln2) => Math.abs(activeLineNumber - ln1) - Math.abs(activeLineNumber - ln2));

	for (const lineNumber of sortedLineNumbers) {
		const diagnosticsAtLine = groupedDiagnostics[lineNumber];
		for (const diagnostic of diagnosticsAtLine) {
			if (isSeverityEnabled(diagnostic.severity)) {
				return diagnostic;
			}
		}
	}
}
/**
 * Get closest by severity diagnostic (error=>warning=>info=>hint)
 *
 * TODO: duplicates code in `statusBarMessage.ts`
 */
function getClosestBySeverityDiagnostic(editor: TextEditor): Diagnostic | undefined {
	const groupedDiagnostics = groupDiagnosticsByLine(languages.getDiagnostics(editor.document.uri));
	const lineNumberKeys = Object.keys(groupedDiagnostics);
	const activeLineNumber = editor.selection.active.line;

	const allDiagnosticsSorted = lineNumberKeys.map(key => groupedDiagnostics[key]).flat().sort((d1, d2) => {
		const severityScore = (d1.severity * 1e4) - (d2.severity * 1e4);
		return severityScore + (Math.abs(activeLineNumber - d1.range.start.line) - Math.abs(activeLineNumber - d2.range.start.line));
	});

	for (const diagnostic of allDiagnosticsSorted) {
		if (isSeverityEnabled(diagnostic.severity)) {
			return diagnostic;
		}
	}
}

/**
 * Is error visible to the user or scrolled out of the editor view?
 */
function isDiagnosticInViewport(editor: TextEditor, diagnostic: Diagnostic): boolean {
	for (const visibleRange of editor.visibleRanges) {
		if (visibleRange.intersection(diagnostic.range)) {
			return true;
		}
	}
	return false;
}

function getClosestDiagnosticInViewport(editor: TextEditor): Diagnostic | undefined {
	const groupedDiagnostics = groupDiagnosticsByLine(languages.getDiagnostics(editor.document.uri));
	const activeLineNumber = editor.selection.active.line;

	for (const key in groupedDiagnostics) {
		const diagnostic = groupedDiagnostics[key][0];
		if (!isDiagnosticInViewport(editor, diagnostic)) {
			delete groupedDiagnostics[key];
		}
	}

	const diagnosticsInViewport = groupedDiagnostics;

	const sortedLineNumbers = Object.keys(diagnosticsInViewport).sort((ln1, ln2) => Math.abs(activeLineNumber - Number(ln1)) - Math.abs(activeLineNumber - Number(ln2)));

	for (const lineNumber of sortedLineNumbers) {
		const diagnosticsAtLine = groupedDiagnostics[lineNumber];
		for (const diagnostic of diagnosticsAtLine) {
			if (isSeverityEnabled(diagnostic.severity)) {
				return diagnostic;
			}
		}
	}
}

/**
 * Tabs take 1 character in line but visually will be multiple characters (according to `editor.tabSize`).
 *
 * @returns How many characters the line visually looks (different from range.end when using tabs to indent).
 */
function getVisualLineLength(textLine: TextLine, indentSize: number, indentStyle: 'spaces' | 'tab'): number {
	if (indentStyle === 'spaces') {
		return textLine.range.end.character;
	} else {
		/** `firstNonWhitespaceCharacterIndex` can include whitespaces, only tabs are needed to correctly get visual indent here */
		const onlyTabsIndent = textLine.text.slice(0, textLine.firstNonWhitespaceCharacterIndex).replace(/[^\t]/gu, '');
		const thisLineIndentSize = onlyTabsIndent.length;
		const textWithoutIndent = textLine.text.slice(thisLineIndentSize);
		return (onlyTabsIndent.length * indentSize) + textWithoutIndent.length;
	}
}
/**
 * Whether or not to align editor message text based on values of `errorLens.alignMessage` setting.
 */
function shouldAlign(): boolean {
	return Boolean($config.alignMessage.start || $config.alignMessage.end);
}
function shouldShowInlineMessage(): boolean {
	const extensionEnabled = $config.messageEnabled;
	const respectUpstreamEnabled = $config.respectUpstreamEnabled;

	if (!respectUpstreamEnabled.enabled || !respectUpstreamEnabled.inlineMessage) {
		return extensionEnabled;
	}

	return extensionEnabled && $state.vscodeGlobalProblemsEnabled;
}
function shouldShowGutterIcons(): boolean {
	const extensionEnabled = $config.gutterIconsEnabled;
	const respectUpstreamEnabled = $config.respectUpstreamEnabled;

	if (!respectUpstreamEnabled.enabled || !respectUpstreamEnabled.gutter) {
		return extensionEnabled;
	}

	return extensionEnabled && $state.vscodeGlobalProblemsEnabled;
}
function shouldShowStatusBarIcons(): boolean {
	const extensionEnabled = $config.statusBarIconsEnabled;
	const respectUpstreamEnabled = $config.respectUpstreamEnabled;

	if (!respectUpstreamEnabled.enabled || !respectUpstreamEnabled.statusBar) {
		return extensionEnabled;
	}

	return extensionEnabled && $state.vscodeGlobalProblemsEnabled;
}
function shouldShowStatusBarMessage(): boolean {
	const extensionEnabled = $config.statusBarMessageEnabled;
	const respectUpstreamEnabled = $config.respectUpstreamEnabled;

	if (!respectUpstreamEnabled.enabled || !respectUpstreamEnabled.statusBar) {
		return extensionEnabled;
	}

	return extensionEnabled && $state.vscodeGlobalProblemsEnabled;
}
/**
 * If units are not specified and the entire string is composed of digits - assume it's `px`.
 */
function addPxUnitsIfNeeded(css: string): string {
	const onlyDigitsRegExp = /^\d+$/u;
	return onlyDigitsRegExp.test(css) ? `${css}px` : css;
}

export const extUtils = {
	prepareMessage,
	getDiagnostics,
	getDiagnosticTarget,
	getDiagnosticCode,
	parseSourceCodeFromString,
	diagnosticToSourceCodeString,
	groupDiagnosticsByLine,
	shouldExcludeDiagnostic,
	isSeverityEnabled,
	diagnosticToInlineMessage,
	getDiagnosticAtLine,
	getClosestDiagnostic,
	getClosestBySeverityDiagnostic,
	getClosestDiagnosticInViewport,
	isDiagnosticInViewport,
	getVisualLineLength,
	shouldAlign,
	shouldShowInlineMessage,
	shouldShowGutterIcons,
	shouldShowStatusBarIcons,
	shouldShowStatusBarMessage,
	addPxUnitsIfNeeded,
};
