import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { InvoiceModalComponent } from '../invoice-modal/invoice-modal.component';
import { NavigationComponent } from '../navigation/navigation.component';
import { SummaryCardsComponent } from '../summary-cards/summary-cards.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    EmptyStateComponent,
    InvoiceModalComponent,
    NavigationComponent,
    SummaryCardsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  selectedFilter = signal<'all' | 'outstanding' | 'paid' | 'uncollectible'>('all');
  selectedTab = signal<'invoices' | 'draft'>('invoices');
  showModal = signal(false);
  editingInvoice = signal<Invoice | null>(null);
  searchQuery = signal('');
  currentPage = signal(1);
  itemsPerPage = 10;
  selectedInvoices = signal<Set<string>>(new Set());

  filteredInvoices = computed(() => {
    let invoices = this.invoiceService.allInvoices();

    // Filter by tab
    if (this.selectedTab() === 'draft') {
      invoices = invoices.filter((inv) => inv.status === 'draft');
    } else {
      invoices = invoices.filter((inv) => inv.status !== 'draft');
    }

    // Filter by status category
    const filter = this.selectedFilter();
    if (filter === 'outstanding') {
      invoices = invoices.filter(
        (inv) =>
          this.getDisplayStatus(inv) === 'Awaiting Payment' ||
          this.getDisplayStatus(inv) === 'Overdue'
      );
    } else if (filter === 'paid') {
      invoices = invoices.filter((inv) => this.getDisplayStatus(inv) === 'Paid');
    } else if (filter === 'uncollectible') {
      invoices = invoices.filter((inv) => this.getDisplayStatus(inv) === 'Uncollectible');
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      invoices = invoices.filter(
        (inv) =>
          inv.id.toLowerCase().includes(query) || inv.clientName.toLowerCase().includes(query)
      );
    }

    return invoices;
  });

  paginatedInvoices = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredInvoices().slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredInvoices().length / this.itemsPerPage);
  });

  filterCounts = computed(() => {
    const all = this.invoiceService.allInvoices().filter((inv) => inv.status !== 'draft');
    return {
      all: all.length,
      outstanding: all.filter((inv) => {
        const status = this.getDisplayStatus(inv);
        return status === 'Awaiting Payment' || status === 'Overdue';
      }).length,
      paid: all.filter((inv) => this.getDisplayStatus(inv) === 'Paid').length,
      uncollectible: all.filter((inv) => this.getDisplayStatus(inv) === 'Uncollectible').length,
    };
  });

  constructor(public invoiceService: InvoiceService, private router: Router) {}

  getDisplayStatus(invoice: Invoice): string {
    if (invoice.status === 'paid') {
      return 'Paid';
    }

    const dueDate = new Date(invoice.paymentDue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (invoice.status === 'draft') {
      // Check if very old (uncollectible)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (dueDate < threeMonthsAgo) {
        return 'Uncollectible';
      }
      return 'Draft';
    }

    if (dueDate < today) {
      return 'Overdue';
    }

    return 'Awaiting Payment';
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Awaiting Payment': 'status-awaiting',
      Paid: 'status-paid',
      Overdue: 'status-overdue',
      Uncollectible: 'status-uncollectible',
      Draft: 'status-draft',
    };
    return statusMap[status] || 'status-draft';
  }

  onFilterChange(filter: 'all' | 'outstanding' | 'paid' | 'uncollectible'): void {
    this.selectedFilter.set(filter);
    this.currentPage.set(1);
  }

  onTabChange(tab: 'invoices' | 'draft'): void {
    this.selectedTab.set(tab);
    this.currentPage.set(1);
  }

  openNewInvoiceModal(): void {
    this.editingInvoice.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingInvoice.set(null);
  }

  onInvoiceSaved(): void {
    this.closeModal();
  }

  navigateToInvoice(id: string): void {
    this.router.navigate(['/invoice', id]);
  }

  toggleSelectInvoice(id: string): void {
    const selected = new Set(this.selectedInvoices());
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    this.selectedInvoices.set(selected);
  }

  toggleSelectAll(): void {
    const selected = new Set(this.selectedInvoices());
    if (selected.size === this.paginatedInvoices().length) {
      this.selectedInvoices.set(new Set());
    } else {
      this.paginatedInvoices().forEach((inv) => selected.add(inv.id));
      this.selectedInvoices.set(selected);
    }
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getAmountDue(invoice: Invoice): number {
    if (invoice.status === 'paid') {
      return 0;
    }
    return invoice.total;
  }
}
