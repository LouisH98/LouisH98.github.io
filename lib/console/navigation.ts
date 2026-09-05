import { projects } from './content';
export type View = 'menu' | 'browser' | 'about' | 'settings' | 'project';
export type Route = { view: View; projectId?: string };
export function parseHash(hash: string): Route {
  const value = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (['browser', 'about', 'settings'].includes(value)) return { view: value as View };
  if (value.startsWith('project/')) {
    const projectId = value.slice(8);
    if (projects.some(p => p.id === projectId)) return { view: 'project', projectId };
    return { view: 'browser' };
  }
  return { view: 'menu' };
}
export function routeHash(route: Route) { return route.view === 'menu' ? '#/' : route.view === 'project' ? `#/project/${route.projectId}` : `#/${route.view}`; }
