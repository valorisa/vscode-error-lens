import path from 'path';
import { CommandId, Constants, ExtensionConfig } from 'src/types';
import { Diagnostic, languages, MarkdownString, Position, StatusBarAlignment, StatusBarItem, ThemeColor, Uri, window } from 'vscode';

type StatusBarProblemType = 'error' | 'warning';

/**
 * Handle status bar updates.
 */
export class StatusBarIcons {
	private errorStatusBarItem: StatusBarItem;
	private readonly warningStatusBarItem: StatusBarItem;

	private readonly errorBackgroundThemeColor = new ThemeColor('statusBarItem.errorBackground');
	private readonly warningBackgroundThemeColor = new ThemeColor('statusBarItem.warningBackground');
	private readonly errorForegroundThemeColor = new ThemeColor('errorLens.statusBarIconErrorForeground');
	private readonly warningForegroundThemeColor = new ThemeColor('errorLens.statusBarIconWarningForeground');

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
		this.setBackground('error');
		this.setForeground('error');
		this.setBackground('warning');
		this.setForeground('warning');

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
				this.clearBackground('error');
				this.clearForeground('error');
				this.errorStatusBarItem.text = `$(error) ${errorCount}`;
				this.errorStatusBarItem.tooltip = this.makeTooltip(errorsWithUri, 'error');
			}
		} else {
			this.setBackground('error');
			this.setForeground('error');
			this.errorStatusBarItem.text = `$(error) ${errorCount}`;
			this.errorStatusBarItem.tooltip = this.makeTooltip(errorsWithUri, 'error');
		}
		if (warningCount === 0) {
			if (this.atZero === 'hide') {
				this.warningStatusBarItem.text = '';
			} else {
				this.clearBackground('warning');
				this.clearForeground('warning');
				this.warningStatusBarItem.text = `$(warning) ${warningCount}`;
				this.warningStatusBarItem.tooltip = this.makeTooltip(warningsWithUri, 'warning');
			}
		} else {
			this.setBackground('warning');
			this.setForeground('warning');
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
	setForeground(statusBarType: StatusBarProblemType): void {
		if (statusBarType === 'error') {
			this.errorStatusBarItem.color = this.errorForegroundThemeColor;
		} else if (statusBarType === 'warning') {
			this.warningStatusBarItem.color = this.warningForegroundThemeColor;
		}
	}
	clearForeground(statusBarType: StatusBarProblemType): void {
		if (statusBarType === 'error') {
			this.errorStatusBarItem.color = undefined;
		} else if (statusBarType === 'warning') {
			this.warningStatusBarItem.color = undefined;
		}
	}
	/**
	 * Set background (only if it's enabled) or clear it.
	 */
	setBackground(statusBarType: StatusBarProblemType): void {
		if (!this.useBackground) {
			return;
		}

		if (statusBarType === 'error') {
			this.errorStatusBarItem.backgroundColor = this.errorBackgroundThemeColor;
		} else if (statusBarType === 'warning') {
			this.warningStatusBarItem.backgroundColor = this.warningBackgroundThemeColor;
		}
	}
	clearBackground(statusBarType: StatusBarProblemType): void {
		if (statusBarType === 'error') {
			this.errorStatusBarItem.backgroundColor = undefined;
		} else if (statusBarType === 'warning') {
			this.warningStatusBarItem.backgroundColor = undefined;
		}
	}
	/**
	 * Dispose both status bar items.
	 */
	dispose(): void {
		this.errorStatusBarItem.dispose();
		this.warningStatusBarItem.dispose();
	}
}
