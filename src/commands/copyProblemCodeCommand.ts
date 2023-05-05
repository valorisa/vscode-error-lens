import { extUtils } from 'src/utils/extUtils';
import { env, window } from 'vscode';

/**
 * Can be used from Command Palette (arg = undefined) or from hover (arg = {code: string | undefined})
 */
export function copyProblemCodeCommand(arg: { code: string | undefined } | undefined): void {
	if (arg) {
		if (typeof arg.code === 'string') {
			env.clipboard.writeText(arg.code);
		}
		return;
	}

	const editor = window.activeTextEditor;
	if (!editor) {
		return;
	}

	const diagnosticAtActiveLineNumber = extUtils.getDiagnosticAtLine(editor.document.uri, editor.selection.active.line);

	if (!diagnosticAtActiveLineNumber) {
		return;
	}

	const codeAsString = extUtils.getDiagnosticCode(diagnosticAtActiveLineNumber);
	if (!codeAsString) {
		return;
	}

	env.clipboard.writeText(codeAsString);
}
