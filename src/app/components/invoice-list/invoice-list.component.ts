import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceStatus } from '../../models/invoice.model';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.css'
})
export class InvoiceListComponent {
  @Input() selectedFilter: InvoiceStatus | 'all' = 'all';
  @Output() filterChange = new EventEmitter<InvoiceStatus | 'all'>();
  
  showDropdown = false;
  
  filters: { label: string; value: InvoiceStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' }
  ];
  
  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }
  
  selectFilter(value: InvoiceStatus | 'all'): void {
    this.selectedFilter = value;
    this.filterChange.emit(value);
    this.showDropdown = false;
  }
  
  getFilterLabel(): string {
    return this.filters.find(f => f.value === this.selectedFilter)?.label || 'All';
  }
}


