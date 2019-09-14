export function truncate(str: string): string {
	const truncationLimit = 500;
	return str.length > truncationLimit ? `${str.slice(0, truncationLimit)}…` : str;
}
