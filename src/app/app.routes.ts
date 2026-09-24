import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    loadComponent: () => import('./modules/home/home')
      .then(m => m.Home)
  },
  {
    path: 'blog',
    loadComponent: () => import('./modules/blog/blog')
      .then(m => m.Blog)
  },
  {
    path: 'listServizi',
    loadComponent: () => import('./modules/servizi/pages/list-servizi/list-servizi')
      .then(m => m.ListServizi)
  },
  {
    path: 'oltreCodice',
    loadComponent: () => import('./modules/oltreCodice/oltreCodice')
      .then(m => m.OltreCodice),
    children: [
      {
        path: 'documents',
        loadComponent: () => import('./modules/oltreCodice/pages/documents/documents')
          .then(m => m.Documents)
      },
      {
        path: 'orto',
        loadComponent: () => import('./modules/oltreCodice/pages/orto/orto')
          .then(m => m.Orto)
      }
    ]
  },
  {
    path: 'who',
    loadComponent: () => import('./modules/who/who')
      .then(m => m.Who)
  },
  {
    path: 'itechblog',
    loadComponent: () => import('./modules/itechblog/itechblog')
      .then(m => m.ItechBlog)
  },
  {
    path: 'contatti',
    loadComponent: () => import('./modules/contatti/contatti')
      .then(m => m.Contatti)
  },
  {
    path: '**',
    loadComponent: () => import('./modules/errors/pages/error/error')
      .then(m => m.Error)
  }
];
