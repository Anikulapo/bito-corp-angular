import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { Invoice, InvoiceFormData, Address, LineItem } from '../../models/invoice.model';

@Component({
  selector: 'app-invoice-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invoice-modal.component.html',
  styleUrl: './invoice-modal.component.css'
})
export class InvoiceModalComponent implements OnInit {
  @Input() invoice: Invoice | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  invoiceForm!: FormGroup;
  isEditMode = false;
  showDeleteConfirm = signal(false);

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.invoice;
    this.initializeForm();
  }

  get lineItems(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  get paymentTermsControl() {
    return this.invoiceForm.get('paymentTerms');
  }

  initializeForm(): void {
    const invoice = this.invoice;
    
    this.invoiceForm = this.fb.group({
      createdAt: [invoice?.createdAt || this.getTodayDate(), Validators.required],
      paymentTerms: [invoice?.paymentTerms || 30, Validators.required],
      description: [invoice?.description || '', Validators.required],
      clientName: [invoice?.clientName || '', Validators.required],
      clientEmail: [invoice?.clientEmail || '', [Validators.required, Validators.email]],
      senderAddress: this.fb.group({
        street: [invoice?.senderAddress.street || '', Validators.required],
        city: [invoice?.senderAddress.city || '', Validators.required],
        postCode: [invoice?.senderAddress.postCode || '', Validators.required],
        country: [invoice?.senderAddress.country || '', Validators.required]
      }),
      clientAddress: this.fb.group({
        street: [invoice?.clientAddress.street || '', Validators.required],
        city: [invoice?.clientAddress.city || '', Validators.required],
        postCode: [invoice?.clientAddress.postCode || '', Validators.required],
        country: [invoice?.clientAddress.country || '', Validators.required]
      }),
      items: this.fb.array([])
    });

    // Add line items
    if (invoice?.items && invoice.items.length > 0) {
      invoice.items.forEach(item => {
        this.addLineItem(item);
      });
    } else {
      this.addLineItem();
    }

    // Update payment due date when payment terms or created date changes
    this.invoiceForm.get('createdAt')?.valueChanges.subscribe(() => this.updatePaymentDue());
    this.invoiceForm.get('paymentTerms')?.valueChanges.subscribe(() => this.updatePaymentDue());
  }

  addLineItem(item?: LineItem): void {
    const lineItemGroup = this.fb.group({
      name: [item?.name || '', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      price: [item?.price || 0, [Validators.required, Validators.min(0)]]
    });

    // Calculate total when quantity or price changes
    lineItemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateLineItemTotal(lineItemGroup));
    lineItemGroup.get('price')?.valueChanges.subscribe(() => this.calculateLineItemTotal(lineItemGroup));

    this.lineItems.push(lineItemGroup);
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length > 1) {
      this.lineItems.removeAt(index);
    }
  }

  calculateLineItemTotal(lineItemGroup: FormGroup): void {
    const quantity = lineItemGroup.get('quantity')?.value || 0;
    const price = lineItemGroup.get('price')?.value || 0;
    // Total is calculated on the server/service side, but we can display it
  }

  getLineItemTotal(index: number): number {
    const item = this.lineItems.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const price = item.get('price')?.value || 0;
    return quantity * price;
  }

  getTotalAmount(): number {
    return this.lineItems.controls.reduce((total, control) => {
      const quantity = control.get('quantity')?.value || 0;
      const price = control.get('price')?.value || 0;
      return total + (quantity * price);
    }, 0);
  }

  updatePaymentDue(): void {
    const createdAt = this.invoiceForm.get('createdAt')?.value;
    const paymentTerms = this.invoiceForm.get('paymentTerms')?.value;
    
    if (createdAt && paymentTerms) {
      const date = new Date(createdAt);
      date.setDate(date.getDate() + paymentTerms);
      // Payment due is calculated in the service, but we can set it here if needed
    }
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  onSaveAsDraft(): void {
    if (this.invoiceForm.valid || this.invoiceForm.get('items')?.valid) {
      this.saveInvoice('draft');
    }
  }

  onSaveAndSend(): void {
    if (this.invoiceForm.valid) {
      this.saveInvoice('pending');
    }
  }

  saveInvoice(status: 'draft' | 'pending'): void {
    if (this.invoiceForm.invalid) {
      this.markFormGroupTouched(this.invoiceForm);
      return;
    }

    const formValue = this.invoiceForm.value;
    const paymentTerms = formValue.paymentTerms;
    const createdAt = new Date(formValue.createdAt);
    const paymentDue = new Date(createdAt);
    paymentDue.setDate(paymentDue.getDate() + paymentTerms);

    const invoiceData: InvoiceFormData = {
      createdAt: formValue.createdAt,
      paymentDue: paymentDue.toISOString().split('T')[0],
      description: formValue.description,
      paymentTerms: paymentTerms,
      clientName: formValue.clientName,
      clientEmail: formValue.clientEmail,
      status: status,
      senderAddress: formValue.senderAddress,
      clientAddress: formValue.clientAddress,
      items: formValue.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    };

    if (this.isEditMode && this.invoice) {
      this.invoiceService.updateInvoice(this.invoice.id, invoiceData);
    } else {
      this.invoiceService.createInvoice(invoiceData);
    }

    this.saved.emit();
  }

  onDelete(): void {
    if (this.invoice) {
      this.invoiceService.deleteInvoice(this.invoice.id);
      this.saved.emit();
    }
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(item => {
          if (item instanceof FormGroup) {
            this.markFormGroupTouched(item);
          }
        });
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}

