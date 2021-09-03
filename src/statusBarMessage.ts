import { diagnosticToInlineMessage, isSeverityEnabled } from 'src/decorations';
import { $config } from 'src/extension';
import { AggregatedByLineDiagnostics, CommandIds, ExtensionConfig } from 'src/types';
import { replaceLinebreaks } from 'src/utils';
import { Diagnostic, Position, StatusBarItem, TextEditor, ThemeColor, window } from 'vscode';
/**
 * Handle status bar updates.
 */
export class StatusBarMessage {
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
		private readonly messageType: ExtensionConfig['statusBarMessageType'],
	) {
		this.colorsEnabled = colorsEnabled;
		this.messageType = messageType;

		this.statusBarItem = window.createStatusBarItem('errorLensMessage', -9999);
		this.statusBarItem.name = 'Error Lens: Message';
		this.statusBarItem.command = CommandIds.statusBarCommand;
		if (this.isEnabled) {
			this.statusBarItem.show();
		} else {
			this.dispose();
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
		let numberOfDiagnosticsOnThatLine = 0;

		if (this.messageType === 'activeLine') {
			if (aggregatedDiagnostics[ln]) {
				for (const diag of aggregatedDiagnostics[ln]) {
					if (isSeverityEnabled(diag.severity)) {
						diagnostic = diag;
						numberOfDiagnosticsOnThatLine = aggregatedDiagnostics[ln].length;
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
						numberOfDiagnosticsOnThatLine = diagnosticsAtLine.length;
						break outerLoop;
					}
				}
			}
		} else if (this.messageType === 'closestSeverity') {
			const allDiagnosticsSorted = keys.map(key => aggregatedDiagnostics[key]).flat().sort((d1, d2) => {
				const severityScore = d1.severity * 1e4 - d2.severity * 1e4;
				return severityScore + (Math.abs(ln - d1.range.start.line) - Math.abs(ln - d2.range.start.line));
			});
			for (const diag of allDiagnosticsSorted) {
				if (isSeverityEnabled(diag.severity)) {
					diagnostic = diag;
					numberOfDiagnosticsOnThatLine = aggregatedDiagnostics[diag.range.start.line].length;
					break;
				}
			}
		}

		if (!diagnostic) {
			this.clear();
			return;
		}

		this.activeMessagePosition = diagnostic.range.start;

		let message = diagnosticToInlineMessage(
			$config.statusBarMessageTemplate || $config.messageTemplate,
			diagnostic,
			numberOfDiagnosticsOnThatLine,
		);

		if ($config.removeLinebreaks) {
			message = replaceLinebreaks(message);
		}

		this.activeMessageText = message;
		this.activeMessageSource = diagnostic.source;


		if (this.colorsEnabled) {
			this.statusBarItem.color = this.statusBarColors[diagnostic.severity];
		}

		this.statusBarItem.text = message;
		this.statusBarItem.tooltip = message;
	}
	/**
	 * Clear status bar message.
	 */
	clear() {
		if (!this.isEnabled) {
			return;
		}
		this.statusBarItem.text = '';
		this.statusBarItem.tooltip = '';
	}
	/**
	 * Dispose status bar item.
	 */
	dispose() {
		this.statusBarItem.dispose();
	}
}
