import { CommandId } from 'src/commands';
import { type RuleDefinitionArgs } from 'src/commands/findLinterRuleDefinitionCommand';
import { Constants } from 'src/types';
import { extensionUtils } from 'src/utils/extensionUtils';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { MarkdownString, type Diagnostic } from 'vscode';

/**
 * Create hover tooltip for text editor decoration.
 */
export function createHoverForDiagnostic({
	diagnostic,
	messageEnabled,
	buttonsEnabled,
}: {
	diagnostic: Diagnostic;
	messageEnabled: boolean;
	buttonsEnabled: boolean;
}): MarkdownString | undefined {
	if (!messageEnabled && !buttonsEnabled) {
		return;
	}

	const markdown = new MarkdownString(undefined, true);
	markdown.supportHtml = true;
	markdown.isTrusted = true;

	let openDocsButton = '';
	const exludeProblemButton = vscodeUtils.createButtonLinkMarkdown({
		text: '$(exclude) Exclude',
		href: vscodeUtils.createCommandUri(CommandId.ExcludeProblem, diagnostic).toString(),
		// title: 'Exclude problem from Error Lens by source/code',
	});

	const diagnosticTarget = extensionUtils.getDiagnosticTarget(diagnostic);
	if (diagnosticTarget) {
		openDocsButton = vscodeUtils.createButtonLinkMarkdown({
			text: '$(book) Docs',
			href: vscodeUtils.createCommandUri(Constants.VscodeOpenCommandId, diagnosticTarget).toString(),
			// title: 'Open diagnostic code or search it in default browser.',
		});
	}

	const diagnosticCode = extensionUtils.getDiagnosticCode(diagnostic);
	const openRuleDefinitionButton = vscodeUtils.createButtonLinkMarkdown({
		text: '$(file) Definition',
		href: vscodeUtils.createCommandUri(CommandId.FindLinterRuleDefinition, { source: diagnostic.source, code: diagnosticCode } satisfies RuleDefinitionArgs).toString(),
		// title: 'Open diagnostic definition (linter file).',
	});

	// ──── Message ───────────────────────────────────────────────
	if (messageEnabled) {
		// markdown.appendMarkdown(`${vscodeUtils.createProblemIconMarkdown(diagnostic.severity === 0 ? 'error' : diagnostic.severity === 1 ? 'warning' : 'info')} `);
		markdown.appendCodeblock(diagnostic.message, 'plaintext');
	}
	// ──── Buttons ───────────────────────────────────────────────
	if (buttonsEnabled) {
		markdown.appendMarkdown('\n\n');
		markdown.appendMarkdown(exludeProblemButton);
		markdown.appendMarkdown(Constants.NonBreakingSpaceSymbolHtml.repeat(2));
		markdown.appendMarkdown(openRuleDefinitionButton);
		if (openDocsButton) {
			markdown.appendMarkdown(Constants.NonBreakingSpaceSymbolHtml.repeat(2));
			markdown.appendMarkdown(openDocsButton);
		}
	}

	return markdown;
}

