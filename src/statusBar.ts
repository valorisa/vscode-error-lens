import { getAnnotationPrefix, isSeverityEnabled } from 'src/decorations';
import { AggregatedByLineDiagnostics, CommandIds, ExtensionConfig } from 'src/types';
import { replaceLinebreaks } from 'src/utils';
import { Diagnostic, Position, StatusBarItem, TextEditor, ThemeColor, window } from 'vscode';

export class StatusBar {
	/**
	 * Status bar item reference.
	 */
	private statusBarItem: StatusBarItem;
	/**
	 * Array of vscode `ThemeColor` for each of 4 diagnostic severity states.
	 */
	statusBarColors: ThemeColor[] = [];
	/**
	 * Position in editor of active message. Needed to jump to error on click.
	 */
	activeMessagePosition: Position = new Position(0, 0);
	/**
	 * Active message text. Needed to copy to clipboard on click.
	 */
	activeMessageText = '';
	/**
	 * Active message source. Needed to copy to clipboard on click.
	 */
	activeMessageSource?: string = '';

	constructor(
		private readonly isEnabled: boolean,
		private readonly colorsEnabled: boolean,
		private readonly addPrefix: boolean,
		private readonly messageType: ExtensionConfig['statusBarMessageType'],
	) {
		this.colorsEnabled = colorsEnabled;
		this.messageType = messageType;
		this.addPrefix = addPrefix;

		this.statusBarItem = window.createStatusBarItem(undefined, -9999);
		this.statusBarItem.command = CommandIds.statusBarCommand;
		if (this.isEnabled) {
			this.statusBarItem.show();
		}
	}
	updateText(editor: TextEditor, aggregatedDiagnostics: AggregatedByLineDiagnostics) {
		if (!this.isEnabled) {
			return;
		}
		const keys = Object.keys(aggregatedDiagnostics);
		if (keys.length === 0) {
			this.clear();
			return;
		}

		const ln = editor.selection.active.line;
		let diagnostic: Diagnostic | undefined;

		if (this.messageType === 'activeLine') {
			if (aggregatedDiagnostics[ln]) {
				for (const diag of aggregatedDiagnostics[ln]) {
					if (isSeverityEnabled(diag.severity)) {
						diagnostic = diag;
					}
				}
			} else {
				this.clear();
				return;
			}
		} else if (this.messageType === 'closestProblem') {
			// Sort by how close it is to the cursor
			const sortedLineNumbers = keys.map(Number).sort((a, b) => Math.abs(ln - a) - Math.abs(ln - b));
			outerLoop:
			for (const lineNumber of sortedLineNumbers) {
				const diagnosticsAtLine = aggregatedDiagnostics[lineNumber];
				for (const diag of diagnosticsAtLine) {
					if (isSeverityEnabled(diag.severity)) {
						diagnostic = diag;
						break outerLoop;
					}
				}
			}
		}

		if (!diagnostic) {
			this.clear();
			return;
		}

		this.activeMessagePosition = diagnostic.range.start;
		let prefix = '';

		if (this.addPrefix) {
			prefix = getAnnotationPrefix(diagnostic.severity);
		}

		let text = `${prefix}${diagnostic.message}`;
		if (text.includes('\n')) {
			text = replaceLinebreaks(text);
		}
		this.activeMessageText = text;
		this.activeMessageSource = diagnostic.source;


		if (this.colorsEnabled) {
			this.statusBarItem.color = this.statusBarColors[diagnostic.severity];
		}

		this.statusBarItem.text = text;
		this.statusBarItem.tooltip = text;
	}

	clear() {
		this.statusBarItem.text = '';
		this.statusBarItem.tooltip = '';
	}

	dispose() {
		this.statusBarItem.dispose();
	}
}
