'use strict';
import * as vscode from 'vscode';
import { workspace } from 'vscode';
import { IConfig } from './types';

const EXTNAME = 'errorLens';

export function activate(context: vscode.ExtensionContext) {
	let config = workspace.getConfiguration(EXTNAME) as any as IConfig;
	let errorLensEnabled = true;

	const disposableEnableErrorLens = vscode.commands.registerCommand('errorLens.toggle', () => {
		errorLensEnabled = !errorLensEnabled;

		const activeTextEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			updateDecorationsForUri(activeTextEditor.document.uri);
		}
	});

	context.subscriptions.push(disposableEnableErrorLens);

	function IsErrorLevelEnabled() {
		return(config.enabledDiagnosticLevels.indexOf('error') >= 0);
	}

	function IsWarningLevelEnabled() {
		return(config.enabledDiagnosticLevels.indexOf('warning') >= 0);
	}

	function IsInfoLevelEnabled() {
		return(config.enabledDiagnosticLevels.indexOf('info') >= 0);
	}

	function IsHintLevelEnabled() {
		return(config.enabledDiagnosticLevels.indexOf('hint') >= 0);
	}

	// Create decorator types that we use to amplify lines containing errors, warnings, info, etc.
	// createTextEditorDecorationType() ref. @ https://code.visualstudio.com/docs/extensionAPI/vscode-api#window.createTextEditorDecorationType
	// DecorationRenderOptions ref.  @ https://code.visualstudio.com/docs/extensionAPI/vscode-api#DecorationRenderOptions

	let errorLensDecorationTypeError: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: config.errorBackground,
	});
	let errorLensDecorationTypeWarning: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: config.warningBackground,
	});
	let errorLensDecorationTypeInfo: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: config.infoBackground,
	});
	let errorLensDecorationTypeHint: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: config.hintBackground,
	});

	vscode.languages.onDidChangeDiagnostics(onChangedDiagnostics, undefined, context.subscriptions);

	// Note: URIs for onDidOpenTextDocument() can contain schemes other than file:// (such as git://)
	vscode.workspace.onDidOpenTextDocument(textDocument => {
		updateDecorationsForUri(textDocument.uri);
	}, undefined, context.subscriptions);

	// Update on editor switch.
	vscode.window.onDidChangeActiveTextEditor(textEditor => {
		if (textEditor === undefined) {
			return;
		}
		updateDecorationsForUri(textEditor.document.uri);
	}, undefined, context.subscriptions);

	/**
     * Invoked by onDidChangeDiagnostics() when the language diagnostics change.
     *
     * @param {vscode.DiagnosticChangeEvent} diagnosticChangeEvent - Contains info about the change in diagnostics.
     */
	function onChangedDiagnostics(diagnosticChangeEvent: vscode.DiagnosticChangeEvent) {
		const activeTextEditor : vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (!activeTextEditor) {
			return;
		}

		// Many URIs can change - we only need to decorate the active text editor
		for (const uri of diagnosticChangeEvent.uris) {
			// Only update decorations for the active text editor.
			if (uri.fsPath === activeTextEditor.document.uri.fsPath) {
				updateDecorationsForUri(uri);
				break;
			}
		}
	}

	/**
     * Update the editor decorations for the provided URI. Only if the URI scheme is "file" is the function
     * processed. (It can be others, such as "git://<something>", in which case the function early-exits).
     *
     * @param {vscode.Uri} uriToDecorate - Uri to add decorations to.
     */
	function updateDecorationsForUri(uriToDecorate : vscode.Uri) {
		if (!uriToDecorate) {
			return;
		}

		// Only process "file://" URIs.
		if (uriToDecorate.scheme !== 'file') {
			return;
		}

		if (!vscode.window) {
			return;
		}

		const activeTextEditor : vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (!activeTextEditor) {
			return;
		}

		if (!activeTextEditor.document.uri.fsPath) {
			return;
		}

		const errorLensDecorationOptionsError: vscode.DecorationOptions[] = [];
		const errorLensDecorationOptionsWarning: vscode.DecorationOptions[] = [];
		const errorLensDecorationOptionsInfo: vscode.DecorationOptions[] = [];
		const errorLensDecorationOptionsHint: vscode.DecorationOptions[] = [];

		// The aggregatedDiagnostics object will contain one or more objects, each object being keyed by "lineN",
		// where N is the source line where one or more diagnostics are being reported.
		// Each object which is keyed by "lineN" will contain one or more arrayDiagnostics[] array of objects.
		// This facilitates gathering info about lines which contain more than one diagnostic.
		// {
		//     line28: {
		//         line: 28,
		//         arrayDiagnostics: [ <vscode.Diagnostic #1> ]
		//     },
		//     line67: {
		//         line: 67,
		//         arrayDiagnostics: [ <vscode.Diagnostic# 1>, <vscode.Diagnostic# 2> ]
		//     },
		//     line93: {
		//         line: 93,
		//         arrayDiagnostics: [ <vscode.Diagnostic #1> ]
		//     }
		// };

		interface IAggregatedDiagnostics {
			[key: string]: {
				line: number;
				arrayDiagnostics: vscode.Diagnostic[];
			};
		}
		if (errorLensEnabled) {
			let aggregatedDiagnostics: IAggregatedDiagnostics = {};
			let diagnostic: vscode.Diagnostic;
			const exclude = config.exclude || [];
			// Iterate over each diagnostic that VS Code has reported for this file. For each one, add to
			// a list of objects, grouping together diagnostics which occur on a single line.
			nextDiagnostic:
			for (diagnostic of vscode.languages.getDiagnostics(uriToDecorate)) {
				// Exclude items specified in `errorLens.exclude` setting
				for (const excludeItem of exclude) {
					if (typeof excludeItem === 'string') {
						if (new RegExp(excludeItem, 'i').test(diagnostic.message)) {
							continue nextDiagnostic;
						}
					} else if (isObject(excludeItem)) {
						if (diagnostic.source === excludeItem.source &&
							String(diagnostic.code) === excludeItem.code) {
							continue nextDiagnostic;
						}
					}
				}
				const key = `line${diagnostic.range.start.line}`;

				if (aggregatedDiagnostics[key]) {
					// Already added an object for this key, so augment the arrayDiagnostics[] array.
					aggregatedDiagnostics[key].arrayDiagnostics.push(diagnostic);
				} else {
					// Create a new object for this key, specifying the line: and a arrayDiagnostics[] array
					aggregatedDiagnostics[key] = {
						line: diagnostic.range.start.line,
						arrayDiagnostics: [diagnostic],
					};
				}
			}

			for (const key in aggregatedDiagnostics) {
				let aggregatedDiagnostic = aggregatedDiagnostics[key];
				let messagePrefix = '';

				if (config.addAnnotationTextPrefixes) {
					if (aggregatedDiagnostic.arrayDiagnostics.length > 1) {
						// If > 1 diagnostic for this source line, the prefix is "Diagnostic #1 of N: "
						messagePrefix += 'Diagnostic 1/' + String(aggregatedDiagnostic.arrayDiagnostics.length) + ': ';
					} else {
						// If only 1 diagnostic for this source line, show the diagnostic severity
						switch (aggregatedDiagnostic.arrayDiagnostics[0].severity) {
							case 0:
								messagePrefix += 'Error: ';
								break;

							case 1:
								messagePrefix += 'Warning: ';
								break;

							case 2:
								messagePrefix += 'Info: ';
								break;

							case 3:
							default:
								messagePrefix += 'Hint: ';
								break;
						}
					}
				}

				let decorationTextColor;
				let addErrorLens = false;
				switch (aggregatedDiagnostic.arrayDiagnostics[0].severity) {
					// Error
					case 0:
						if (IsErrorLevelEnabled()) {
							addErrorLens = true;
							decorationTextColor = config.errorForeground;
						}
						break;
					// Warning
					case 1:
						if (IsWarningLevelEnabled()) {
							addErrorLens = true;
							decorationTextColor = config.warningForeground;
						}
						break;
					// Info
					case 2:
						if (IsInfoLevelEnabled()) {
							addErrorLens = true;
							decorationTextColor = config.infoForeground;
						}
						break;
					// Hint
					case 3:
						if (IsHintLevelEnabled()) {
							addErrorLens = true;
							decorationTextColor = config.hintForeground;
						}
						break;
				}

				if (addErrorLens) {
					// Generate a DecorationInstanceRenderOptions object which specifies the text which will be rendered
					// after the source-code line in the editor, and text rendering options.
					const decInstanceRenderOptions: vscode.DecorationInstanceRenderOptions = {
						after: {
							contentText: truncate(messagePrefix + aggregatedDiagnostic.arrayDiagnostics[0].message),
							fontStyle: config.fontStyle,
							fontWeight: config.fontWeight,
							margin: config.margin,
							color: decorationTextColor,
						},
					};

					// See type 'DecorationOptions': https://code.visualstudio.com/docs/extensionAPI/vscode-api#DecorationOptions
					const diagnosticDecorationOptions: vscode.DecorationOptions = {
						range: aggregatedDiagnostic.arrayDiagnostics[0].range,
						renderOptions: decInstanceRenderOptions,
					};

					switch (aggregatedDiagnostic.arrayDiagnostics[0].severity) {
						// Error
						case 0:
							errorLensDecorationOptionsError.push(diagnosticDecorationOptions);
							break;
						// Warning
						case 1:
							errorLensDecorationOptionsWarning.push(diagnosticDecorationOptions);
							break;
						// Info
						case 2:
							errorLensDecorationOptionsInfo.push(diagnosticDecorationOptions);
							break;
						// Hint
						case 3:
							errorLensDecorationOptionsHint.push(diagnosticDecorationOptions);
							break;
					}
				}
			}
		}

		// The errorLensDecorationOptions<X> arrays have been built, now apply them.
		activeTextEditor.setDecorations(errorLensDecorationTypeError, errorLensDecorationOptionsError);
		activeTextEditor.setDecorations(errorLensDecorationTypeWarning, errorLensDecorationOptionsWarning);
		activeTextEditor.setDecorations(errorLensDecorationTypeInfo, errorLensDecorationOptionsInfo);
		activeTextEditor.setDecorations(errorLensDecorationTypeHint, errorLensDecorationOptionsHint);
	}

	function updateConfig(e: vscode.ConfigurationChangeEvent) {
		if (!e.affectsConfiguration(EXTNAME)) return;

		config = workspace.getConfiguration(EXTNAME) as any as IConfig;

		const activeTextEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			activeTextEditor.setDecorations(errorLensDecorationTypeError, []);
			activeTextEditor.setDecorations(errorLensDecorationTypeWarning, []);
			activeTextEditor.setDecorations(errorLensDecorationTypeInfo, []);
			activeTextEditor.setDecorations(errorLensDecorationTypeHint, []);
		}

		errorLensDecorationTypeError = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.errorBackground,
		});
		errorLensDecorationTypeWarning = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.warningBackground,
		});
		errorLensDecorationTypeInfo = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.infoBackground,
		});
		errorLensDecorationTypeHint = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: config.hintBackground,
		});

		if (activeTextEditor) {
			updateDecorationsForUri(activeTextEditor.document.uri);
		}
	}

	context.subscriptions.push(workspace.onDidChangeConfiguration(updateConfig, EXTNAME));

	/**
      * Truncate the supplied string to a constant number of characters. (This truncation
      * limit is hard-coded, and may be changed only by editing the const inside this function).
      *
      * @param {string} str - The string to truncate.
      * @returns {string} - The truncated string, if the string argument is over the hard-coded limit.
      */
	function truncate(str: string): string {
		const truncationLimit = 300;
		return str.length > truncationLimit ? str.slice(0, truncationLimit) + '…' : str;
	}
}

function isObject(x: any): boolean {
	return typeof x === 'object' && x !== null;
}

// this method is called when your extension is deactivated
export function deactivate() {}
