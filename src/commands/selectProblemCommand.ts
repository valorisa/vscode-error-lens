import { Selection, commands, languages, type Diagnostic, type TextEditor } from 'vscode';

/**
 * Can be used from Command Palette (arg = undefined) or from hover (arg = {code: string | undefined})
 */
export function selectProblemCommand(editor: TextEditor): void {
	const diagnostics = languages.getDiagnostics(editor.document.uri);

	if (!diagnostics.length) {
		return;
	}

	let diagnostic = getFocusedDiagnostic(editor, diagnostics);
	if (!diagnostic) {
		commands.executeCommand('editor.action.marker.next');
		// hide diagnostic message window
		commands.executeCommand('closeMarkersNavigation');
		diagnostic = getFocusedDiagnostic(editor, diagnostics);
	}

	if (!diagnostic) {
		return;
	}

	editor.selection = new Selection(diagnostic.range.start, diagnostic.range.end);
}

function getFocusedDiagnostic(editor: TextEditor, diagnostics: Diagnostic[]): Diagnostic | undefined {
	const pos = editor.selection.active;
	return diagnostics.find(diagnostic => diagnostic.range.contains(pos));
}
