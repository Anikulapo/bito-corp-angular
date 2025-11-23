import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'invoice/:id',
    loadComponent: () => import('./components/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
