import type * as vscode from 'vscode';
import { promises as fs } from 'fs';

import type { IGutter } from './types';
import { config } from './extension';

export function getGutterStyles(extensionContext: vscode.ExtensionContext): IGutter {
	const gutter: IGutter = Object.create(null);

	gutter.iconSet = config.gutterIconSet;
	if (config.gutterIconSet !== 'borderless' &&
		config.gutterIconSet !== 'default' &&
		config.gutterIconSet !== 'circle' &&
		config.gutterIconSet !== 'defaultOutline') {
		gutter.iconSet = 'default';
	}

	if (gutter.iconSet === 'circle') {
		writeCircleGutterIconsToDisk(extensionContext);
	}

	gutter.errorIconPath = config.errorGutterIconPath || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-dark.svg`);
	gutter.errorIconPathLight = config.light.errorGutterIconPath || (config.errorGutterIconPath ? config.errorGutterIconPath : false) || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/error-light.svg`);
	gutter.warningIconPath = config.warningGutterIconPath || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-dark.svg`);
	gutter.warningIconPathLight = config.light.warningGutterIconPath || (config.warningGutterIconPath ? config.warningGutterIconPath : false) || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/warning-light.svg`);
	gutter.infoIconPath = config.infoGutterIconPath || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-dark.svg`);
	gutter.infoIconPathLight = config.light.infoGutterIconPath || (config.infoGutterIconPath ? config.infoGutterIconPath : false) || extensionContext.asAbsolutePath(`./img/${gutter.iconSet}/info-light.svg`);

	return gutter;
}

/**
 * The idea of circle gutter icons is that it should be possible to change their color. AFAIK that's only possible with writing <svg> to disk and then referencing them from extension.
 */
function writeCircleGutterIconsToDisk(extensionContext: vscode.ExtensionContext): void {
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/error-dark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${config.errorGutterIconColor}"/></svg>`);
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/error-light.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${config.light.errorGutterIconColor || config.errorGutterIconColor}"/></svg>`);

	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/warning-dark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${config.warningGutterIconColor}"/></svg>`);
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/warning-light.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${config.light.warningGutterIconColor || config.warningGutterIconColor}"/></svg>`);

	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/info-dark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${config.infoGutterIconColor}"/></svg>`);
	fs.writeFile(extensionContext.asAbsolutePath('./img/circle/info-light.svg'), `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="9" fill="${config.light.infoGutterIconColor || config.infoGutterIconColor}"/></svg>`);
}
