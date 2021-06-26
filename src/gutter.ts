import { promises as fs } from 'fs';
import path from 'path';
import { isSeverityEnabled } from 'src/decorations';
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

	// Copy custom gutter icons into extension directory. (Workaround vscode sandbox restriction).
	if (extensionConfig.errorGutterIconPath) {
		const baseName = path.basename(extensionConfig.errorGutterIconPath);
		const newPath = path.join(Global.extensionContext.asAbsolutePath('./img'), baseName);
		fs.copyFile(extensionConfig.errorGutterIconPath, newPath);
		gutter.errorIconPath = newPath;
	} else {
		gutter.errorIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-dark.svg`);
	}
	if (extensionConfig.light.errorGutterIconPath) {
		const baseName = path.basename(extensionConfig.light.errorGutterIconPath);
		const newPath = path.join(Global.extensionContext.asAbsolutePath('./img'), baseName);
		fs.copyFile(extensionConfig.light.errorGutterIconPath, newPath);
		gutter.errorIconPathLight = newPath;
	} else {
		gutter.errorIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-light.svg`);
	}
	if (extensionConfig.warningGutterIconPath) {
		const baseName = path.basename(extensionConfig.warningGutterIconPath);
		const newPath = path.join(Global.extensionContext.asAbsolutePath('./img'), baseName);
		fs.copyFile(extensionConfig.warningGutterIconPath, newPath);
		gutter.warningIconPath = newPath;
	} else {
		gutter.warningIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-dark.svg`);
	}
	if (extensionConfig.light.warningGutterIconPath) {
		const baseName = path.basename(extensionConfig.light.warningGutterIconPath);
		const newPath = path.join(Global.extensionContext.asAbsolutePath('./img'), baseName);
		fs.copyFile(extensionConfig.light.warningGutterIconPath, newPath);
		gutter.warningIconPathLight = newPath;
	} else {
		gutter.warningIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-light.svg`);
	}
	if (extensionConfig.infoGutterIconPath) {
		const baseName = path.basename(extensionConfig.infoGutterIconPath);
		const newPath = path.join(Global.extensionContext.asAbsolutePath('./img'), baseName);
		fs.copyFile(extensionConfig.infoGutterIconPath, newPath);
		gutter.infoIconPath = newPath;
	} else {
		gutter.infoIconPath = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-dark.svg`);
	}
	if (extensionConfig.light.infoGutterIconPath) {
		const baseName = path.basename(extensionConfig.light.infoGutterIconPath);
		const newPath = path.join(Global.extensionContext.asAbsolutePath('./img'), baseName);
		fs.copyFile(extensionConfig.light.infoGutterIconPath, newPath);
		gutter.infoIconPathLight = newPath;
	} else {
		gutter.infoIconPathLight = extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-light.svg`);
	}

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
		const diagnostic = aggregatedDiagnostic[0];
		const severity = diagnostic.severity;

		if (isSeverityEnabled(severity)) {
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
