export function truncateString(str: string): string {
	const charLimit = 500;
	return str.length > charLimit ? `${str.slice(0, charLimit)}…` : str;
}

export function replaceLinebreaks(str: string): string {
	return str.replace(/\n/g, ' ');
}
