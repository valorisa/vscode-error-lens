import { Selection, type TextEditor, languages, commands } from 'vscode';

/**
 * Can be used from Command Palette (arg = undefined) or from hover (arg = {code: string | undefined})
 */
export async function selectProblem(editor: TextEditor): Promise<void> {
	const diagnostics = languages.getDiagnostics(editor.document.uri);

	if (!diagnostics.length) {
		return;
	}

	const getFocusedDiagnostic = () => {
		const pos = editor.selection.active;
		return diagnostics.find(diagnostic => diagnostic.range.contains(pos));
	};

	let diagnostic = getFocusedDiagnostic();
	if (!diagnostic) {
		void commands.executeCommand('editor.action.marker.next');
		// hide diagnostic message window
		void commands.executeCommand('closeMarkersNavigation');
		diagnostic = getFocusedDiagnostic();
	}
	if (!diagnostic) {
		return;
	}

	const { range } = diagnostic;
	editor.selection = new Selection(range.start, range.end);
}
