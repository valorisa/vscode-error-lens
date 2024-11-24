import { extUtils } from 'src/utils/extUtils';
import { env, languages, window, type TextEditor } from 'vscode';

export function copyProblemMessageCommand(editorOrErrorMessage: TextEditor | string): void {
	if (typeof editorOrErrorMessage === 'string') {
		env.clipboard.writeText(editorOrErrorMessage);
		return;
	}

	const groupedDiagnostics = extUtils.groupDiagnosticsByLine(languages.getDiagnostics(editorOrErrorMessage.document.uri));

	const activeLineNumber = editorOrErrorMessage.selection.active.line;
	const diagnosticAtActiveLineNumber = groupedDiagnostics[activeLineNumber];
	if (!diagnosticAtActiveLineNumber) {
		window.showInformationMessage('There\'s no problem at the active line.');
		return;
	}

	const renderedDiagnostic = diagnosticAtActiveLineNumber[0];
	const source = renderedDiagnostic.source ? `[${renderedDiagnostic.source}] ` : '';

	env.clipboard.writeText(source + renderedDiagnostic.message);
}
