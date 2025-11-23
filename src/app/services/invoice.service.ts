import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Invoice,
  InvoiceStatus,
  InvoiceFormData,
  Address,
  LineItem,
} from '../models/invoice.model';
import { firstValueFrom } from 'rxjs';

const STORAGE_KEY = 'invoices';

interface JsonInvoice {
  id: string;
  client: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountDue: number;
  status: 'paid' | 'awaiting' | 'overdue' | 'uncollectable';
}

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private invoices = signal<Invoice[]>(this.loadFromStorage());
  private dataLoaded = false;

  // Computed signals
  readonly allInvoices = computed(() => this.invoices());
  readonly invoiceCount = computed(() => this.invoices().length);
  readonly paidInvoices = computed(() => this.invoices().filter((inv) => inv.status === 'paid'));
  readonly pendingInvoices = computed(() =>
    this.invoices().filter((inv) => inv.status === 'pending')
  );
  readonly draftInvoices = computed(() => this.invoices().filter((inv) => inv.status === 'draft'));

  constructor(private http: HttpClient) {
    // Load from JSON file if localStorage is empty (first time)
    if (this.invoices().length === 0) {
      this.loadInitialData();
    } else {
      this.dataLoaded = true; // Mark as loaded if we have data from storage
    }
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices().find((inv) => inv.id === id);
  }

  getInvoicesByStatus(status: InvoiceStatus | 'all'): Invoice[] {
    if (status === 'all') {
      return this.invoices();
    }
    return this.invoices().filter((inv) => inv.status === status);
  }

  createInvoice(formData: InvoiceFormData): Invoice {
    const invoice: Invoice = {
      ...formData,
      id: this.generateId(),
      items: formData.items.map((item) => ({
        ...item,
        id: this.generateId(),
        total: item.quantity * item.price,
      })),
      total: formData.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    };

    this.invoices.update((invoices) => [...invoices, invoice]);
    this.saveToStorage();
    return invoice;
  }

  updateInvoice(id: string, formData: InvoiceFormData): Invoice | null {
    const existingInvoice = this.getInvoiceById(id);
    if (!existingInvoice) {
      return null;
    }

    const updatedInvoice: Invoice = {
      ...formData,
      id,
      items: formData.items.map((item) => ({
        ...item,
        id: this.generateId(),
        total: item.quantity * item.price,
      })),
      total: formData.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    };

    this.invoices.update((invoices) =>
      invoices.map((inv) => (inv.id === id ? updatedInvoice : inv))
    );
    this.saveToStorage();
    return updatedInvoice;
  }

  deleteInvoice(id: string): boolean {
    const exists = this.getInvoiceById(id);
    if (!exists) {
      return false;
    }

    this.invoices.update((invoices) => invoices.filter((inv) => inv.id !== id));
    this.saveToStorage();
    return true;
  }

  updateInvoiceStatus(id: string, status: InvoiceStatus): boolean {
    const invoice = this.getInvoiceById(id);
    if (!invoice) {
      return false;
    }

    this.invoices.update((invoices) =>
      invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv))
    );
    this.saveToStorage();
    return true;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
  }

  private loadFromStorage(): Invoice[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.invoices()));
    } catch (error) {
      console.error('Failed to save invoices to storage:', error);
    }
  }

  private async loadInitialData(): Promise<void> {
    if (this.dataLoaded) return;

    try {
      const jsonData = await firstValueFrom(this.http.get<JsonInvoice[]>('/data/invoices.json'));

      const mappedInvoices = jsonData.map((item) => this.mapJsonToInvoice(item));
      this.invoices.set(mappedInvoices);
      this.saveToStorage();
      this.dataLoaded = true;
    } catch (error) {
      console.error('Failed to load initial invoice data:', error);
      this.dataLoaded = true;
    }
  }

  private mapJsonToInvoice(json: JsonInvoice): Invoice {
    // Map status values
    let status: InvoiceStatus = 'draft';
    if (json.status === 'paid') {
      status = 'paid';
    } else if (json.status === 'awaiting' || json.status === 'overdue') {
      status = 'pending';
    } else {
      status = 'draft';
    }

    // Calculate payment terms from dates
    const issueDate = new Date(json.issueDate);
    const dueDate = new Date(json.dueDate);
    const paymentTerms = Math.ceil(
      (dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create default addresses (since JSON doesn't have them)
    const defaultSenderAddress: Address = {
      street: '19 Union Terrace',
      city: 'London',
      postCode: 'E1 3EZ',
      country: 'United Kingdom',
    };

    const defaultClientAddress: Address = {
      street: '123 Client Street',
      city: 'London',
      postCode: 'SW1A 1AA',
      country: 'United Kingdom',
    };

    // Create a default line item from the total
    const defaultItem: LineItem = {
      id: this.generateId(),
      name: 'Service Fee',
      quantity: 1,
      price: json.total,
      total: json.total,
    };

    return {
      id: json.id,
      createdAt: json.issueDate,
      paymentDue: json.dueDate,
      description: `Invoice for ${json.client}`,
      paymentTerms: paymentTerms,
      clientName: json.client,
      clientEmail: `${json.client.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      status: status,
      senderAddress: defaultSenderAddress,
      clientAddress: defaultClientAddress,
      items: [defaultItem],
      total: json.total,
    };
  }
}
