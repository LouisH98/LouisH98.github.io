declare const __PAGES_BASE_PATH__: string;
export function asset(path: string) { return `${__PAGES_BASE_PATH__}/${path.replace(/^\/+/, '')}`; }
