import { extUtils } from 'src/utils/extUtils';
import { Selection, type TextEditor } from 'vscode';

/**
 * Can be used from Command Palette (arg = undefined) or from hover (arg = {code: string | undefined})
 */
export function selectProblem(editor: TextEditor): void {
	const diagnosticAtActiveLineNumber = extUtils.getDiagnosticAtLine(editor.document.uri, editor.selection.active.line);

	if (!diagnosticAtActiveLineNumber) {
		return;
	}

	const { range } = diagnosticAtActiveLineNumber;
	editor.selection = new Selection(range.start, range.end);
}
