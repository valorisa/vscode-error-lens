import { CustomDelay } from 'src/CustomDelay';
import { updateAllDecorations, updateDecorationsForUri } from 'src/decorations';
import { extensionConfig, Global } from 'src/extension';
import vscode, { window, workspace } from 'vscode';

export function updateChangedActiveTextEditorListener(): void {
	if (Global.onDidChangeActiveTextEditor) {
		Global.onDidChangeActiveTextEditor.dispose();
	}
	Global.onDidChangeActiveTextEditor = window.onDidChangeActiveTextEditor(textEditor => {
		if (extensionConfig.onSave) {
			Global.lastSavedTimestamp = Date.now();// Show decorations when opening/changing files
		}
		if (textEditor) {
			updateDecorationsForUri(textEditor.document.uri, textEditor);
		}
	});
}
export function updateChangeVisibleTextEditorsListener(): void {
	if (Global.onDidChangeVisibleTextEditors) {
		Global.onDidChangeVisibleTextEditors.dispose();
	}
	Global.onDidChangeVisibleTextEditors = window.onDidChangeVisibleTextEditors(updateAllDecorations);
}
export function updateChangeDiagnosticListener(): void {
	if (Global.onDidChangeDiagnosticsDisposable) {
		Global.onDidChangeDiagnosticsDisposable.dispose();
	}
	function onChangedDiagnostics(diagnosticChangeEvent: vscode.DiagnosticChangeEvent): void {
		// Many URIs can change - we only need to decorate all visible editors
		for (const uri of diagnosticChangeEvent.uris) {
			for (const editor of window.visibleTextEditors) {
				if (uri.fsPath === editor.document.uri.fsPath) {
					updateDecorationsForUri(uri, editor);
				}
			}
		}
	}
	if (extensionConfig.onSave) {
		Global.onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(e => {
			if (Date.now() - Global.lastSavedTimestamp < 1000) {
				onChangedDiagnostics(e);
			}
		});
		return;
	}
	if (typeof extensionConfig.delay === 'number' && extensionConfig.delay > 0) {
		Global.customDelay = new CustomDelay(extensionConfig.delay);
		Global.onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(Global.customDelay.onDiagnosticChange);
	} else {
		Global.onDidChangeDiagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(onChangedDiagnostics);
	}
}
export function updateCursorChangeListener(): void {
	if (Global.onDidCursorChangeDisposable) {
		Global.onDidCursorChangeDisposable.dispose();
	}
	if (extensionConfig.followCursor === 'activeLine' || extensionConfig.followCursor === 'closestProblem' || extensionConfig.statusBarMessageEnabled) {
		let lastPositionLine = 999999;// Unlikely line number
		Global.onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection(e => {
			const selection = e.selections[0];
			if (e.selections.length === 1 &&
					selection.isEmpty &&
					lastPositionLine !== selection.active.line) {
				updateDecorationsForUri(e.textEditor.document.uri, e.textEditor, selection);
				lastPositionLine = e.selections[0].active.line;
			}
		});
	}
}
export function updateOnSaveListener(): void {
	if (Global.onDidSaveTextDocumentDisposable) {
		Global.onDidSaveTextDocumentDisposable.dispose();
	}
	if (!extensionConfig.onSave) {
		return;
	}
	Global.onDidSaveTextDocumentDisposable = workspace.onDidSaveTextDocument(e => {
		Global.lastSavedTimestamp = Date.now();
		setTimeout(() => {
			updateDecorationsForUri(e.uri);
		}, 600);
	});
}
