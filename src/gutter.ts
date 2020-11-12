import { promises as fs } from 'fs';
import { extensionConfig, Global } from 'src/extension';
import { AggregatedByLineDiagnostics, Gutter } from 'src/types';
import vscode from 'vscode';

export function getGutterStyles(extensionContext: vscode.ExtensionContext): Gutter {
	const gutter: Gutter = Object.create(null);

	gutter.iconSet = extensionConfig.gutterIconSet;
	if (extensionConfig.gutterIconSet !== 'borderless' &&
		extensionConfig.gutterIconSet !== 'default' &&
		extensionConfig.gutterIconSet !== 'circle' &&
		extensionConfig.gutterIconSet !== 'defaultOutline') {
		gutter.iconSet = 'default';
	}

	if (gutter.iconSet === 'circle') {
		writeCircleGutterIconsToDisk(extensionContext);
	}

	gutter.errorIconPath = extensionConfig.errorGutterIconPath || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-dark.svg`);
	gutter.errorIconPathLight = extensionConfig.light.errorGutterIconPath || (extensionConfig.errorGutterIconPath ? extensionConfig.errorGutterIconPath : false) || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-light.svg`);
	gutter.warningIconPath = extensionConfig.warningGutterIconPath || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-dark.svg`);
	gutter.warningIconPathLight = extensionConfig.light.warningGutterIconPath || (extensionConfig.warningGutterIconPath ? extensionConfig.warningGutterIconPath : false) || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-light.svg`);
	gutter.infoIconPath = extensionConfig.infoGutterIconPath || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-dark.svg`);
	gutter.infoIconPathLight = extensionConfig.light.infoGutterIconPath || (extensionConfig.infoGutterIconPath ? extensionConfig.infoGutterIconPath : false) || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-light.svg`);

	return gutter;
}

/**
 * The idea of circle gutter icons is that it should be possible to change their color. AFAIK that's only possible with writing <svg> to disk and then referencing them from extension.
 */
function writeCircleGutterIconsToDisk(extensionContext: vscode.ExtensionContext): void {
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/error-dark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${extensionConfig.errorGutterIconColor}"/></svg>`);
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/error-light.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${extensionConfig.light.errorGutterIconColor || extensionConfig.errorGutterIconColor}"/></svg>`);

	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/warning-dark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${extensionConfig.warningGutterIconColor}"/></svg>`);
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/warning-light.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${extensionConfig.light.warningGutterIconColor || extensionConfig.warningGutterIconColor}"/></svg>`);

	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/info-dark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${extensionConfig.infoGutterIconColor}"/></svg>`);
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/info-light.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${extensionConfig.light.infoGutterIconColor || extensionConfig.infoGutterIconColor}"/></svg>`);
}

export function actuallyUpdateGutterDecorations(editor: vscode.TextEditor, aggregatedDiagnostics: AggregatedByLineDiagnostics): void {
	const decorationOptionsGutterError: vscode.DecorationOptions[] = [];
	const decorationOptionsGutterWarning: vscode.DecorationOptions[] = [];
	const decorationOptionsGutterInfo: vscode.DecorationOptions[] = [];

	for (const key in aggregatedDiagnostics) {
		const aggregatedDiagnostic = aggregatedDiagnostics[key].sort((a, b) => a.severity - b.severity);
		let addErrorLens = false;
		const diagnostic = aggregatedDiagnostic[0];
		const severity = diagnostic.severity;

		switch (severity) {
			case 0: addErrorLens = Global.configErrorEnabled && Global.errorEnabled; break;
			case 1: addErrorLens = Global.configWarningEnabled && Global.warningEabled; break;
			case 2: addErrorLens = Global.configInfoEnabled && Global.infoEnabled; break;
			case 3: addErrorLens = Global.configHintEnabled && Global.hintEnabled; break;
		}
		if (addErrorLens) {
			const diagnosticDecorationOptions: vscode.DecorationOptions = {
				range: diagnostic.range,
			};
			switch (severity) {
				case 0: decorationOptionsGutterError.push(diagnosticDecorationOptions); break;
				case 1: decorationOptionsGutterWarning.push(diagnosticDecorationOptions); break;
				case 2: decorationOptionsGutterInfo.push(diagnosticDecorationOptions); break;
			}
		}
	}
	editor.setDecorations(Global.decorationTypeGutterError, decorationOptionsGutterError);
	editor.setDecorations(Global.decorationTypeGutterWarning, decorationOptionsGutterWarning);
	editor.setDecorations(Global.decorationTypeGutterInfo, decorationOptionsGutterInfo);
}
