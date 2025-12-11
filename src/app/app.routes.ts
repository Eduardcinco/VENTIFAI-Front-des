import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
	{ 
		path: 'primer-login', 
		loadComponent: () => import('./components/primer-login/primer-login.component').then(m => m.PrimerLoginComponent) 
	},
	{
		path: 'dashboard',
		loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
		canActivate: [
			() => import('./guards/auth.guard').then(m => m.AuthGuard),
			() => import('./guards/primer-acceso.guard').then(m => m.primerAccesoGuard)
		],
		children: [
			{ path: '', loadComponent: () => import('./components/dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent) },
			{ path: 'inventory', loadComponent: () => import('./components/dashboard/inventory/inventory.component').then(m => m.InventoryComponent) },
			{ path: 'inventory/new', loadComponent: () => import('./components/product-form/product-form.component').then(m => m.ProductFormComponent) },
			{ path: 'inventory/:id', loadComponent: () => import('./components/product-form/product-form.component').then(m => m.ProductFormComponent) },
			{ path: 'pos', loadComponent: () => import('./components/dashboard/pos/pos.component').then(m => m.PosComponent) },
			{ path: 'caja', loadComponent: () => import('./components/dashboard/caja/caja.component').then(m => m.CajaComponent) },
			{ path: 'proveedores', loadComponent: () => import('./components/dashboard/suppliers/suppliers.component').then(m => m.SuppliersComponent) },
			{ path: 'facturacion', loadComponent: () => import('./components/dashboard/billing/billing.component').then(m => m.BillingComponent) },
			{ path: 'cuentas/por-cobrar', loadComponent: () => import('./components/dashboard/accounts-receivable/accounts-receivable.component').then(m => m.AccountsReceivableComponent) },
			{ path: 'cuentas/por-pagar', loadComponent: () => import('./components/dashboard/accounts-payable/accounts-payable.component').then(m => m.AccountsPayableComponent) },
			{ path: 'reports', loadComponent: () => import('./components/dashboard/reports/reports.component').then(m => m.ReportsComponent) },
			{ 
				path: 'settings', 
				loadComponent: () => import('./components/dashboard/settings/settings.component').then(m => m.SettingsComponent),
				canActivate: [() => import('./guards/role.guard').then(m => m.RoleGuard)],
				data: { roles: ['dueño'] }
			},
		]
	},
	{ path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
	{ path: 'register', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
	{ path: '**', redirectTo: '' }
];
