import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { InvoiceModalComponent } from '../invoice-modal/invoice-modal.component';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, InvoiceModalComponent],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.css'
})
export class InvoiceDetailComponent implements OnInit {
  invoice: Invoice | null = null;
  showModal = signal(false);
  showDeleteConfirm = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.invoice = this.invoiceService.getInvoiceById(id) || null;
      if (!this.invoice) {
        this.router.navigate(['/']);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  openEditModal(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    // Refresh invoice data
    if (this.invoice) {
      const updated = this.invoiceService.getInvoiceById(this.invoice.id);
      if (updated) {
        this.invoice = updated;
      }
    }
  }

  onInvoiceSaved(): void {
    this.closeModal();
  }

  markAsPaid(): void {
    if (this.invoice) {
      this.invoiceService.updateInvoiceStatus(this.invoice.id, 'paid');
      this.invoice = this.invoiceService.getInvoiceById(this.invoice.id) || null;
    }
  }

  deleteInvoice(): void {
    if (this.invoice) {
      this.invoiceService.deleteInvoice(this.invoice.id);
      this.router.navigate(['/']);
    }
  }

  getStatusColor(status: InvoiceStatus): string {
    switch (status) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-pending';
      case 'draft':
        return 'status-draft';
      default:
        return '';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}


