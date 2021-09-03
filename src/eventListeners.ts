import { CustomDelay } from 'src/CustomDelay';
import { updateDecorationsForAllVisibleEditors, updateDecorationsForUri } from 'src/decorations';
import { $config, Global } from 'src/extension';
import { DiagnosticChangeEvent, languages, TextDocumentSaveReason, window, workspace } from 'vscode';
/**
 * Update listener for when active editor changes.
 */
export function updateChangedActiveTextEditorListener() {
	Global.onDidChangeActiveTextEditor?.dispose();

	Global.onDidChangeActiveTextEditor = window.onDidChangeActiveTextEditor(textEditor => {
		if ($config.onSave) {
			Global.lastSavedTimestamp = Date.now();// Show decorations when opening/changing files
		}
		if (textEditor) {
			updateDecorationsForUri(textEditor.document.uri, textEditor);
		} else {
			Global.statusBarMessage.clear();
		}
	});
}
/**
 * Update listener for when visible editors change.
 */
export function updateChangeVisibleTextEditorsListener() {
	Global.onDidChangeVisibleTextEditors?.dispose();

	Global.onDidChangeVisibleTextEditors = window.onDidChangeVisibleTextEditors(updateDecorationsForAllVisibleEditors);
}
/**
 * Update listener for when language server (or extension) sends diagnostic change events.
 */
export function updateChangeDiagnosticListener() {
	Global.onDidChangeDiagnosticsDisposable?.dispose();

	function onChangedDiagnostics(diagnosticChangeEvent: DiagnosticChangeEvent) {
		// Many URIs can change - we only need to decorate visible editors
		for (const uri of diagnosticChangeEvent.uris) {
			for (const editor of window.visibleTextEditors) {
				if (uri.fsPath === editor.document.uri.fsPath) {
					updateDecorationsForUri(uri, editor);
				}
			}
		}
		if ($config.statusBarIconsEnabled) {
			Global.statusBarIcons.updateText();
		}
	}
	if ($config.onSave) {
		Global.onDidChangeDiagnosticsDisposable = languages.onDidChangeDiagnostics(e => {
			if (Date.now() - Global.lastSavedTimestamp < $config.onSaveTimeout) {
				onChangedDiagnostics(e);
			}
		});
		return;
	}
	if (typeof $config.delay === 'number' && $config.delay > 0) {
		Global.customDelay = new CustomDelay($config.delay);
		Global.onDidChangeDiagnosticsDisposable = languages.onDidChangeDiagnostics(Global.customDelay.onDiagnosticChange);
	} else {
		Global.onDidChangeDiagnosticsDisposable = languages.onDidChangeDiagnostics(onChangedDiagnostics);
	}
}
/**
 * Update listener for when active selection (cursor) moves.
 */
export function updateCursorChangeListener() {
	Global.onDidCursorChangeDisposable?.dispose();

	if ($config.followCursor === 'activeLine' || $config.followCursor === 'closestProblem' || $config.statusBarMessageEnabled) {
		let lastPositionLine = 999999;// Unlikely line number
		Global.onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection(e => {
			const selection = e.selections[0];
			if (
				e.selections.length === 1 &&
				selection.isEmpty &&
				lastPositionLine !== selection.active.line
			) {
				updateDecorationsForUri(e.textEditor.document.uri, e.textEditor, selection);
				lastPositionLine = e.selections[0].active.line;
			}
		});
	}
}
/**
 * Update listener for when user performs manual save.
 *
 * Editor `files.autoSave` is ignored.
 */
export function updateOnSaveListener() {
	Global.onDidSaveTextDocumentDisposable?.dispose();

	if (!$config.onSave) {
		return;
	}
	Global.onDidSaveTextDocumentDisposable = workspace.onWillSaveTextDocument(e => {
		if (e.reason === TextDocumentSaveReason.Manual) {
			setTimeout(() => {
				updateDecorationsForUri(e.document.uri);
			}, 200);
			Global.lastSavedTimestamp = Date.now();
		}
	});
}
