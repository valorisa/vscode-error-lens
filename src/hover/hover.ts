import { CommandId } from 'src/commands';
import { type RuleDefinitionArgs } from 'src/commands/findLinterRuleDefinitionCommand';
import { Constants, type ExtensionConfig } from 'src/types';
import { extUtils } from 'src/utils/extUtils';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { MarkdownString, type Diagnostic } from 'vscode';

/**
 * Create hover tooltip for text editor decoration.
 */
export function createHoverForDiagnostic({
	diagnostic,
	messageEnabled,
	buttonsEnabled,
	sourceCodeEnabled,
	lintFilePaths,
}: {
	diagnostic: Diagnostic;
	messageEnabled: boolean;
	buttonsEnabled: boolean;
	sourceCodeEnabled: boolean;
	lintFilePaths: ExtensionConfig['lintFilePaths'];
}): MarkdownString | undefined {
	if (!messageEnabled && !buttonsEnabled && !sourceCodeEnabled) {
		return;
	}

	const markdown = new MarkdownString(undefined, true);
	markdown.supportHtml = true;
	markdown.isTrusted = true;

	const diagnosticTarget = extUtils.getDiagnosticTarget(diagnostic);
	const diagnosticCode = extUtils.getDiagnosticCode(diagnostic);

	// ──── Message ───────────────────────────────────────────────
	if (messageEnabled) {
		const problemIcon = vscodeUtils.createProblemIconMarkdown(diagnostic.severity === 0 ? 'error' : diagnostic.severity === 1 ? 'warning' : 'info');
		markdown.appendMarkdown(`<table>`);
		markdown.appendMarkdown(`<tr>`);
		markdown.appendMarkdown(`<td>${problemIcon}</td>`);
		markdown.appendMarkdown(`<td>`);
		markdown.appendMarkdown('\n\n');
		markdown.appendCodeblock(diagnostic.message, 'plaintext');
		markdown.appendMarkdown('\n\n');
		markdown.appendMarkdown(`</td>`);
		markdown.appendMarkdown(`</tr>`);
		markdown.appendMarkdown(`</table>`);
	}
	// ──── Source Code ──────────────────────────────────────────
	if (sourceCodeEnabled) {
		const copyCodeButton = vscodeUtils.createButtonLinkMarkdown({
			text: '$(clippy) Copy',
			href: vscodeUtils.createCommandUri(CommandId.CopyProblemCode, { code: diagnosticCode }).toString(),
			title: 'Copy problem code into the clipboard.',
		});
		markdown.appendMarkdown('\n\n');
		markdown.appendMarkdown(`${diagnostic.source ?? '<No source>'}(\`${diagnosticCode ?? '<No code>'}\`) `);
		if (diagnosticCode) {
			markdown.appendMarkdown(copyCodeButton);
		}
	}
	// ──── Buttons ───────────────────────────────────────────────
	if (buttonsEnabled) {
		const exludeProblemButton = vscodeUtils.createButtonLinkMarkdown({
			text: '$(exclude) Exclude',
			href: vscodeUtils.createCommandUri(CommandId.ExcludeProblem, diagnostic).toString(),
			title: 'Exclude problem from Error Lens by source/code',
		});
		const openRuleDefinitionButton = vscodeUtils.createButtonLinkMarkdown({
			text: '$(file) Definition',
			href: vscodeUtils.createCommandUri(CommandId.FindLinterRuleDefinition, { source: diagnostic.source, code: diagnosticCode } satisfies RuleDefinitionArgs).toString(),
			title: 'Open diagnostic definition (linter file).',
		});
		const searchForProblemButton = vscodeUtils.createButtonLinkMarkdown({
			text: '$(search) Search',
			href: vscodeUtils.createCommandUri(CommandId.SearchForProblem, diagnostic).toString(),
			title: 'Open problem in default browser (controlled by `errorLens.searchForProblemQuery` setting).',
		});

		markdown.appendMarkdown('\n\n');
		markdown.appendMarkdown(exludeProblemButton);

		if (lintFilePaths[String(diagnostic?.source)] !== 'none') {
			markdown.appendMarkdown(Constants.NonBreakingSpaceSymbolHtml.repeat(2));
			markdown.appendMarkdown(openRuleDefinitionButton);
		}

		if (diagnosticTarget) {
			markdown.appendMarkdown(Constants.NonBreakingSpaceSymbolHtml.repeat(2));
			const openDocsButton = vscodeUtils.createButtonLinkMarkdown({
				text: '$(book) Docs',
				href: vscodeUtils.createCommandUri(Constants.VscodeOpenCommandId, diagnosticTarget).toString(),
				title: 'Open diagnostic code or search it in default browser.',
			});
			markdown.appendMarkdown(openDocsButton);
		}

		markdown.appendMarkdown(Constants.NonBreakingSpaceSymbolHtml.repeat(2));
		markdown.appendMarkdown(searchForProblemButton);
	}

	return markdown;
}

