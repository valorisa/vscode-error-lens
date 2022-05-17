import path from 'path';
import { CommandId, Constants, ExtensionConfig } from 'src/types';
import { Diagnostic, languages, MarkdownString, Position, StatusBarAlignment, StatusBarItem, ThemeColor, Uri, window } from 'vscode';

/** Handle status bar updates. */
export class StatusBarIcons {
	/**
	 * Error icon
	 */
	private errorStatusBarItem: StatusBarItem;
	/**
	 * Warning icon
	 */
	private readonly warningStatusBarItem: StatusBarItem;
	/**
	 * Error background (status bar)
	 */
	private readonly errorBackground = new ThemeColor('statusBarItem.errorBackground');
	/**
	 * Warning background (status bar)
	 */
	private readonly warningBackground = new ThemeColor('statusBarItem.warningBackground');
	private readonly errorForeground = new ThemeColor('errorLens.statusBarIconErrorForeground');
	private readonly warningForeground = new ThemeColor('errorLens.statusBarIconWarningForeground');

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
		private readonly atZero: ExtensionConfig['statusBarIconsAtZero'],
		private readonly useBackground: ExtensionConfig['statusBarIconsUseBackground'],
		priority: ExtensionConfig['statusBarIconsPriority'],
		alignment: ExtensionConfig['statusBarIconsAlignment'],
	) {
		const statusBarAlignment = alignment === 'right' ? StatusBarAlignment.Right : StatusBarAlignment.Left;
		this.errorStatusBarItem = window.createStatusBarItem('errorLensError', statusBarAlignment, priority);
		this.errorStatusBarItem.name = 'Error Lens: Error icon';
		this.errorStatusBarItem.command = Constants.OpenProblemsViewCommandId;
		this.warningStatusBarItem = window.createStatusBarItem('errorLensWarning', statusBarAlignment, priority - 1);
		this.warningStatusBarItem.name = 'Error Lens: Warning icon';
		this.warningStatusBarItem.command = Constants.OpenProblemsViewCommandId;
		this.setBackground('error', this.errorBackground);
		this.setBackground('warning', this.warningBackground);
		this.errorStatusBarItem.color = this.errorForeground;
		this.warningStatusBarItem.color = this.warningForeground;
		if (this.isEnabled) {
			this.errorStatusBarItem.show();
			this.warningStatusBarItem.show();
		} else {
			this.dispose();
		}
	}
	updateText(): void {
		if (!this.isEnabled) {
			return;
		}
		const allDiagnostics = languages.getDiagnostics();
		const errorsWithUri: [Uri, Diagnostic[]][] = [];
		const warningsWithUri: [Uri, Diagnostic[]][] = [];
		let errorCount = 0;
		let warningCount = 0;
		for (const diagnosticWithUri of allDiagnostics) {
			const uri = diagnosticWithUri[0];
			const diagnostics = diagnosticWithUri[1];
			const errors = [];
			const warnings = [];
			for (const diag of diagnostics) {
				if (diag.severity === 0) {
					errors.push(diag);
				} else if (diag.severity === 1) {
					warnings.push(diag);
				}
			}
			errorCount += errors.length;
			warningCount += warnings.length;
			if (errors.length) {
				errorsWithUri.push([
					uri,
					errors,
				]);
			}
			if (warnings.length) {
				warningsWithUri.push([
					uri,
					warnings,
				]);
			}
		}
		if (errorCount === 0) {
			if (this.atZero === 'hide') {
				this.errorStatusBarItem.text = '';
			} else {
				this.setBackground('error', '');
				this.errorStatusBarItem.text = `$(error) ${errorCount}`;
				this.errorStatusBarItem.tooltip = this.makeTooltip(errorsWithUri, 'error');
			}
		} else {
			this.setBackground('error', this.errorBackground);
			this.errorStatusBarItem.text = `$(error) ${errorCount}`;
			this.errorStatusBarItem.tooltip = this.makeTooltip(errorsWithUri, 'error');
		}
		if (warningCount === 0) {
			if (this.atZero === 'hide') {
				this.warningStatusBarItem.text = '';
			} else {
				this.setBackground('warning', '');
				this.warningStatusBarItem.text = `$(warning) ${warningCount}`;
				this.warningStatusBarItem.tooltip = this.makeTooltip(warningsWithUri, 'warning');
			}
		} else {
			this.setBackground('warning', this.warningBackground);
			this.warningStatusBarItem.text = `$(warning) ${warningCount}`;
			this.warningStatusBarItem.tooltip = this.makeTooltip(warningsWithUri, 'warning');
		}
	}
	makeTooltip(allDiagnostics: [Uri, Diagnostic[]][], type: 'error' | 'warning'): MarkdownString {
		const md = new MarkdownString(undefined, true);
		md.isTrusted = true;
		for (const diagWithUri of allDiagnostics) {
			const uri = diagWithUri[0];
			const diagnostics = diagWithUri[1];
			if (diagnostics.length) {
				md.appendMarkdown(`**${path.basename(uri.path)}**\n\n`);
			}
			for (const diag of diagnostics) {
				const revealLineUri = Uri.parse(
					`command:${CommandId.revealLine}?${encodeURIComponent(JSON.stringify([uri.fsPath, [diag.range.start.line, diag.range.start.character]]))}`,
				);
				md.appendMarkdown(`<span style="color:${type === 'error' ? '#e45454' : '#ff942f'};">$(${type})</span> [${diag.message} \`${diag.source}\`](${revealLineUri})\n\n`);
			}
		}
		return md;
	}
	/**
	 * Set background of the item (only if it's enabled).
	 */
	setBackground(which: 'error' | 'warning', color: ThemeColor | string): void {
		if (this.useBackground) {
			if (which === 'error') {
				this.errorStatusBarItem.backgroundColor = color;
			} else if (which === 'warning') {
				this.warningStatusBarItem.backgroundColor = color;
			}
		}
	}
	/**
	 * Dispose status bar item.
	 */
	dispose(): void {
		this.errorStatusBarItem.dispose();
		this.warningStatusBarItem.dispose();
	}
}
