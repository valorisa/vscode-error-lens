import { extUtils } from 'src/utils/extUtils';
import { Selection, type TextEditor } from 'vscode';

/**
 * Can be used from Command Palette (arg = undefined) or from hover (arg = {code: string | undefined})
 */
export function selectProblemCommand(editor: TextEditor): void {
	const closestDiagnostic = extUtils.getClosestDiagnostic(editor);

	if (!closestDiagnostic) {
		return;
	}

	editor.selection = new Selection(closestDiagnostic.range.start, closestDiagnostic.range.end);
	editor.revealRange(closestDiagnostic.range);
}
