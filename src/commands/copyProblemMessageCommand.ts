import { extUtils } from 'src/utils/extUtils';
import { env, languages, window, type TextEditor } from 'vscode';

export function copyProblemMessageCommand(editor: TextEditor): void {
	const groupedDiagnostics = extUtils.groupDiagnosticsByLine(languages.getDiagnostics(editor.document.uri));

	const activeLineNumber = editor.selection.active.line;
	const diagnosticAtActiveLineNumber = groupedDiagnostics[activeLineNumber];
	if (!diagnosticAtActiveLineNumber) {
		window.showInformationMessage('There\'s no problem at the active line.');
		return;
	}

	const renderedDiagnostic = diagnosticAtActiveLineNumber[0];
	const source = renderedDiagnostic.source ? `[${renderedDiagnostic.source}] ` : '';

	env.clipboard.writeText(source + renderedDiagnostic.message);
}
