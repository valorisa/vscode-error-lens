import debounce from 'lodash/debounce';
import { clearDecorations, updateDecorationsForUri } from 'src/decorations';
import { $state } from 'src/extension';
import { DiagnosticChangeEvent, Disposable, Uri, window, workspace } from 'vscode';

export class NewDelay {
	private readonly updateDecorationsDebounced: (uri: Uri)=> void;
	private readonly documentChangeDisposable: Disposable;

	constructor(delayMs: number) {
		this.updateDecorationsDebounced = debounce(this.updateDecorations, delayMs, {
			leading: false,
			trailing: true,
		});
		this.documentChangeDisposable = workspace.onDidChangeTextDocument(e => {
			this.clearDecorationsForAllVisibleEditors();
			this.updateDecorationsDebounced(e.document.uri);
		});
	}

	dispose(): void {
		this.documentChangeDisposable?.dispose();
	}

	onDiagnosticChange = (event: DiagnosticChangeEvent): void => {
		for (const uri of event.uris) {
			for (const editor of window.visibleTextEditors) {
				if (editor.document.uri.toString(true) === uri.toString(true)) {
					this.updateDecorationsDebounced(uri);
				}
			}
		}
	};

	private readonly updateDecorations = (uri: Uri): void => {
		$state.log('NewDelay => updateDecorations()', uri.toString(true));
		updateDecorationsForUri({
			uri,
		});
		$state.statusBarIcons.updateText();
	};

	private clearDecorationsForAllVisibleEditors(): void {
		for (const editor of window.visibleTextEditors) {
			clearDecorations({
				editor,
			});
		}
	}
}
