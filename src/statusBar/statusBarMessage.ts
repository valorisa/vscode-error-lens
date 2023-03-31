import { CommandId } from 'src/commands';
import { diagnosticToInlineMessage, isSeverityEnabled } from 'src/decorations';
import { $config } from 'src/extension';
import { type AggregatedByLineDiagnostics, type ExtensionConfig } from 'src/types';
import { utils } from 'src/utils/utils';
import { MarkdownString, Position, StatusBarAlignment, window, type Diagnostic, type StatusBarItem, type TextEditor, type ThemeColor } from 'vscode';

interface StatusBarMessageInit {
	isEnabled: boolean;
	colorsEnabled: boolean;
	messageType: ExtensionConfig['statusBarMessageType'];
	priority: ExtensionConfig['statusBarMessagePriority'];
	alignment: ExtensionConfig['statusBarMessageAlignment'];
}

/**
 * Handle status bar updates.
 */
export class StatusBarMessage {
	/**
	 * Array of vscode `ThemeColor` for each of 4 diagnostic severity states.
	 */
	public statusBarColors: ThemeColor[] = [];
	/**
	 * Position in editor of active message. Needed to jump to error on click.
	 */
	public activeMessagePosition: Position = new Position(0, 0);
	/**
	 * Active message text. Needed to copy to clipboard on click.
	 */
	public activeMessageText = '';
	/**
	 * Active message source. Needed to copy to clipboard on click.
	 */
	public activeMessageSource?: string = '';
	/**
	 * Status bar item reference.
	 */
	private readonly statusBarItem: StatusBarItem;
	private readonly isEnabled: boolean;
	private readonly colorsEnabled: boolean;
	private readonly messageType: ExtensionConfig['statusBarMessageType'];

	constructor(
		{
			isEnabled,
			colorsEnabled,
			messageType,
			priority,
			alignment,
		}: StatusBarMessageInit,
	) {
		const statusBarAlignment = alignment === 'right' ? StatusBarAlignment.Right : StatusBarAlignment.Left;
		this.isEnabled = isEnabled;
		this.colorsEnabled = colorsEnabled;
		this.messageType = messageType;

		this.statusBarItem = window.createStatusBarItem('errorLensMessage', statusBarAlignment, priority);
		this.statusBarItem.name = 'Error Lens: Message';
		this.statusBarItem.command = CommandId.StatusBarCommand;
		if (this.isEnabled) {
			this.statusBarItem.show();
		} else {
			this.dispose();
		}
	}

	public updateText(editor: TextEditor, aggregatedDiagnostics: AggregatedByLineDiagnostics): void {
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
				const severityScore = (d1.severity * 1e4) - (d2.severity * 1e4);
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
			message = utils.replaceLinebreaks(message, $config.replaceLinebreaksSymbol);
		}

		this.activeMessageText = message;
		this.activeMessageSource = diagnostic.source;

		if (this.colorsEnabled) {
			this.statusBarItem.color = this.statusBarColors[diagnostic.severity];
		}

		this.statusBarItem.text = message;
		this.statusBarItem.tooltip = this.makeTooltip(message, diagnostic);
	}

	/**
	 * Clear status bar message.
	 */
	public clear(): void {
		if (!this.isEnabled) {
			return;
		}
		this.statusBarItem.text = '';
		this.statusBarItem.tooltip = '';
	}

	/**
	 * Dispose status bar item.
	 */
	public dispose(): void {
		this.statusBarItem.dispose();
	}

	private makeTooltip(message: string, diagnostic: Diagnostic): MarkdownString {
		const markdown = new MarkdownString();
		markdown.isTrusted = true;
		markdown.appendText(message);
		markdown.appendMarkdown('\n\n---\n\n');
		const code = typeof diagnostic.code === 'string' ?
			diagnostic.code :
			typeof diagnostic.code === 'number' ?
				String(diagnostic.code) :
				`${diagnostic.code?.value ?? '<No code>'}`;
		markdown.appendMarkdown(`[${diagnostic.source ?? '<No source>'} [${code}]`);
		return markdown;
	}
}
