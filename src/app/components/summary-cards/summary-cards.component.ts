import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';

@Component({
  selector: 'app-summary-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-cards.component.html',
  styleUrl: './summary-cards.component.css',
})
export class SummaryCardsComponent {
  constructor(public invoiceService: InvoiceService) {}

  // Calculate summary values
  overdueAmount = computed(() => {
    return this.invoiceService.allInvoices()
      .filter(inv => {
        const dueDate = new Date(inv.paymentDue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return (inv.status === 'pending' || inv.status === 'draft') && dueDate < today;
      })
      .reduce((sum, inv) => sum + inv.total, 0);
  });

  totalOutstanding = computed(() => {
    return this.invoiceService.allInvoices()
      .filter(inv => inv.status === 'pending' || inv.status === 'draft')
      .reduce((sum, inv) => sum + inv.total, 0);
  });

  getPaidAmount = computed(() => {
    // This should show the amount that can be collected (pending invoices not overdue)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.invoiceService.allInvoices()
      .filter(inv => {
        if (inv.status === 'paid') return false;
        const dueDate = new Date(inv.paymentDue);
        dueDate.setHours(0, 0, 0, 0);
        return (inv.status === 'pending' || inv.status === 'draft') && dueDate >= today;
      })
      .reduce((sum, inv) => sum + inv.total, 0);
  });

  uncollectibleAmount = computed(() => {
    // Invoices that are very old and unpaid
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return this.invoiceService.allInvoices()
      .filter(inv => {
        if (inv.status === 'paid') return false;
        const dueDate = new Date(inv.paymentDue);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < threeMonthsAgo;
      })
      .reduce((sum, inv) => sum + inv.total, 0);
  });
}

