import { copyProblemMessageCommand } from 'src/commands/copyProblemMessageCommand';
import { excludeProblemCommand } from 'src/commands/excludeProblemCommand';
import { findLinterRuleDefinitionCommand } from 'src/commands/findLinterRuleDefinitionCommand';
import { revealLineCommand } from 'src/commands/revealLineCommand';
import { statusBarCommand } from 'src/commands/statusBarCommand';
import { toggleEnabledLevels } from 'src/commands/toggleEnabledLevels';
import { toggleWorkspaceCommand } from 'src/commands/toggleWorkspaceCommand';
import { $config } from 'src/extension';
import { vscodeUtils } from 'src/utils/vscodeUtils';
import { commands, type ExtensionContext } from 'vscode';

/**
 * All command ids contributed by this extensions.
 */
export const enum CommandId {
	// ──── User facing ───────────────────────────────────────────
	Toggle = 'errorLens.toggle',
	ToggleError = 'errorLens.toggleError',
	ToggleWarning = 'errorLens.toggleWarning',
	ToggleInfo = 'errorLens.toggleInfo',
	ToggleHint = 'errorLens.toggleHint',
	ToggleWorkspace = 'errorlens.toggleWorkspace',
	CopyProblemMessage = 'errorLens.copyProblemMessage',
	FindLinterRuleDefinition = 'errorLens.findLinterRuleDefinition',
	// ──── Internal ──────────────────────────────────────────────
	StatusBarCommand = 'errorLens.statusBarCommand',
	RevealLine = 'errorLens.revealLine',
	ExcludeProblem = 'errorLens.excludeProblem',
}

/**
 * Register all commands contributed by this extension.
 */
export function registerAllCommands(context: ExtensionContext): void {
	// ────────────────────────────────────────────────────────────
	// ──── Global commands ───────────────────────────────────────
	// ────────────────────────────────────────────────────────────
	context.subscriptions.push(commands.registerCommand(CommandId.Toggle, () => {
		vscodeUtils.updateGlobalSetting('errorLens.enabled', !$config.enabled);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleError, () => {
		toggleEnabledLevels('error', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleWarning, () => {
		toggleEnabledLevels('warning', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleInfo, () => {
		toggleEnabledLevels('info', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleHint, () => {
		toggleEnabledLevels('hint', $config.enabledDiagnosticLevels);
	}));
	context.subscriptions.push(commands.registerCommand(CommandId.ToggleWorkspace, toggleWorkspaceCommand));
	context.subscriptions.push(commands.registerCommand(CommandId.RevealLine, revealLineCommand));
	context.subscriptions.push(commands.registerCommand(CommandId.FindLinterRuleDefinition, findLinterRuleDefinitionCommand));
	context.subscriptions.push(commands.registerCommand(CommandId.ExcludeProblem, excludeProblemCommand));
	// ────────────────────────────────────────────────────────────
	// ──── Text Editor commands ──────────────────────────────────
	// ────────────────────────────────────────────────────────────
	context.subscriptions.push(commands.registerTextEditorCommand(CommandId.CopyProblemMessage, copyProblemMessageCommand));
	context.subscriptions.push(commands.registerTextEditorCommand(CommandId.StatusBarCommand, statusBarCommand));
}

