import { CommandId } from 'src/commands';
import { type RuleDefinitionArgs } from 'src/commands/findLinterRuleDefinitionCommand';
import { Constants } from 'src/types';
import { extensionUtils } from 'src/utils/extensionUtils';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { MarkdownString, type Diagnostic } from 'vscode';

/**
 *
 */
export function createHoverForDiagnostic(message: string | undefined, diagnostic: Diagnostic): MarkdownString {
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
			text: '$(book) Rule Docs',
			href: vscodeUtils.createCommandUri(Constants.VscodeOpenCommandId, diagnosticTarget).toString(),
			// title: 'Open diagnostic code or search it in default browser.',
		});
	}

	const diagnosticCode = extensionUtils.getDiagnosticCode(diagnostic);
	const openRuleDefinitionButton = vscodeUtils.createButtonLinkMarkdown({
		text: '$(file) Rule definition',
		href: vscodeUtils.createCommandUri(CommandId.FindLinterRuleDefinition, { source: diagnostic.source, code: diagnosticCode } satisfies RuleDefinitionArgs).toString(),
	});

	markdown.appendMarkdown(`${vscodeUtils.createProblemIconMarkdown(diagnostic.severity === 0 ? 'error' : diagnostic.severity === 1 ? 'warning' : 'info')} `);
	markdown.appendMarkdown(message ?? diagnostic.message);
	markdown.appendMarkdown('\n\n');
	markdown.appendMarkdown(exludeProblemButton);
	if (openDocsButton) {
		markdown.appendMarkdown(Constants.NonBreakingSpaceSymbolHtml.repeat(2));
		markdown.appendMarkdown(openDocsButton);
	}
	markdown.appendMarkdown(Constants.NonBreakingSpaceSymbolHtml.repeat(2));
	markdown.appendMarkdown(openRuleDefinitionButton);

	return markdown;
}

