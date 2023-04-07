import { type Diagnostic, type Uri } from 'vscode';

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

export const extensionUtils = {
	getDiagnosticTarget,
	getDiagnosticCode,
	parseSourceCodeFromString,
	diagnosticToSourceCodeString,
};
