export function truncateString(str: string): string {
	const truncationLimit = 500;
	return str.length > truncationLimit ? `${str.slice(0, truncationLimit)}…` : str;
}
export function replaceNewlines(str: string): string {
	return str.replace(/\n/g, ' ');
}
