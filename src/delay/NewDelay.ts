import debounce from 'lodash/debounce';
import { clearDecorations, updateDecorationsForAllVisibleEditors } from 'src/decorations';
import { $state } from 'src/extension';
import { DiagnosticChangeEvent, Disposable, window, workspace } from 'vscode';

export class NewDelay {
	private readonly updateDecorationsDebounced: ()=> void;
	private readonly documentChangeDisposable: Disposable;

	constructor(delayMs: number) {
		this.updateDecorationsDebounced = debounce(() => {
			updateDecorationsForAllVisibleEditors();
			$state.statusBarIcons.updateText();
		}, delayMs, {
			leading: false,
			trailing: true,
		});
		this.documentChangeDisposable = workspace.onDidChangeTextDocument(_ => {
			this.clearDecorationsForAllVisibleEditors();
			this.updateDecorationsDebounced();
		});
	}

	dispose(): void {
		this.documentChangeDisposable?.dispose();
	}

	onDiagnosticChange = (_: DiagnosticChangeEvent): void => {
		this.updateDecorationsDebounced();
	};

	private clearDecorationsForAllVisibleEditors(): void {
		for (const editor of window.visibleTextEditors) {
			clearDecorations({
				editor,
			});
		}
	}
}
