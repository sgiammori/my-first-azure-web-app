import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { routesIDs } from './core/services/data/routeids';

export const serverRoutes: ServerRoute[] = [
  /*{
    path: 'welcome/:userId',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const ids = routesIDs;
      return ids.map(ids => ({ userId: ids }));
    }
  },*/
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
