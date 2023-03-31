import { type AggregatedByLineDiagnostics } from 'src/types';
import { env, languages, window, type TextEditor } from 'vscode';

export function copyProblemMessageCommand(editor: TextEditor): void {
	const aggregatedDiagnostics: AggregatedByLineDiagnostics = {};
	for (const diagnostic of languages.getDiagnostics(editor.document.uri)) {
		const key = diagnostic.range.start.line;

		if (aggregatedDiagnostics[key]) {
			aggregatedDiagnostics[key].push(diagnostic);
		} else {
			aggregatedDiagnostics[key] = [diagnostic];
		}
	}
	const activeLineNumber = editor.selection.active.line;
	const diagnosticAtActiveLineNumber = aggregatedDiagnostics[activeLineNumber];
	if (!diagnosticAtActiveLineNumber) {
		window.showInformationMessage('There\'s no problem at the active line.');
		return;
	}
	const renderedDiagnostic = diagnosticAtActiveLineNumber.sort((a, b) => a.severity - b.severity)[0];
	const source = renderedDiagnostic.source ? `[${renderedDiagnostic.source}] ` : '';
	env.clipboard.writeText(source + renderedDiagnostic.message);
}
