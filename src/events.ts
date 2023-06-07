import { CustomDelay } from 'src/CustomDelay';
import { updateDecorationsForAllVisibleEditors, updateDecorationsForUri } from 'src/decorations';
import { $config, $state } from 'src/extension';
import { TextDocumentSaveReason, languages, window, workspace, type DiagnosticChangeEvent } from 'vscode';

/**
 * Update listener for when active editor changes.
 */
export function updateChangedActiveTextEditorListener(): void {
	$state.onDidChangeActiveTextEditor?.dispose();

	$state.onDidChangeActiveTextEditor = window.onDidChangeActiveTextEditor(editor => {
		if ($config.onSave) {
			$state.lastSavedTimestamp = Date.now();// Show decorations when opening/changing files
		}
		if (editor) {
			updateDecorationsForUri({
				uri: editor.document.uri,
				editor,
			});
		} else {
			$state.statusBarMessage.clear();
		}
	});
}
/**
 * Update listener for when visible editors change.
 */
export function updateChangeVisibleTextEditorsListener(): void {
	$state.onDidChangeVisibleTextEditors?.dispose();

	$state.onDidChangeVisibleTextEditors = window.onDidChangeVisibleTextEditors(updateDecorationsForAllVisibleEditors);
}
/**
 * Update listener for when language server (or extension) sends diagnostic change events.
 */
export function updateChangeDiagnosticListener(): void {
	$state.onDidChangeDiagnosticsDisposable?.dispose();

	function onChangedDiagnostics(diagnosticChangeEvent: DiagnosticChangeEvent): void {
		// Many URIs can change - we only need to decorate visible editors
		for (const uri of diagnosticChangeEvent.uris) {
			for (const editor of window.visibleTextEditors) {
				if (uri.toString(true) === editor.document.uri.toString(true)) {
					updateDecorationsForUri({
						uri,
						editor,
					});
				}
			}
		}
		$state.statusBarIcons.updateText();
	}
	if ($config.onSave) {
		$state.onDidChangeDiagnosticsDisposable = languages.onDidChangeDiagnostics(e => {
			if (Date.now() - $state.lastSavedTimestamp < $config.onSaveTimeout) {
				onChangedDiagnostics(e);
			}
		});
		return;
	}
	if (typeof $config.delay === 'number' && $config.delay > 0) {
		$state.customDelay = new CustomDelay($config.delay);
		$state.onDidChangeDiagnosticsDisposable = languages.onDidChangeDiagnostics($state.customDelay.onDiagnosticChange);
	} else {
		$state.onDidChangeDiagnosticsDisposable = languages.onDidChangeDiagnostics(onChangedDiagnostics);
	}
}
/**
 * Update listener for when active selection (cursor) moves.
 */
export function updateCursorChangeListener(): void {
	$state.onDidCursorChangeDisposable?.dispose();

	if (
		$config.followCursor === 'activeLine' ||
		$config.followCursor === 'closestProblem' ||
		$config.followCursor === 'allLinesExceptActive' ||
		$config.statusBarMessageEnabled
	) {
		let lastPositionLine = -1;
		$state.onDidCursorChangeDisposable = window.onDidChangeTextEditorSelection(e => {
			const selection = e.selections[0];
			if (
				e.selections.length === 1 &&
				selection.isEmpty &&
				lastPositionLine !== selection.active.line
			) {
				updateDecorationsForUri({
					uri: e.textEditor.document.uri,
					editor: e.textEditor,
					range: selection,
				});
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
export function updateOnSaveListener(): void {
	$state.onDidSaveTextDocumentDisposable?.dispose();

	if (!$config.onSave) {
		return;
	}

	$state.onDidSaveTextDocumentDisposable = workspace.onWillSaveTextDocument(e => {
		if (e.reason === TextDocumentSaveReason.Manual) {
			setTimeout(() => {
				updateDecorationsForUri({
					uri: e.document.uri,
				});
			}, 200);
			$state.lastSavedTimestamp = Date.now();
		}
	});
}
