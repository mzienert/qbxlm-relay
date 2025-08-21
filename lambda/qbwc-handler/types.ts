// QBXML Type definitions for Phase 2

export interface QBXMLRequest {
  requestID: string;
  entityType: QBEntityType;
  operation: QBOperation;
  filters?: QBXMLFilters;
  includeFields?: string[];
  maxReturned?: number;
}

export interface QBXMLResponse {
  requestID: string;
  statusCode: string;
  statusSeverity: 'Info' | 'Warn' | 'Error';
  statusMessage: string;
  entities: QBEntity[];
  totalRecords?: number;
  hasMore?: boolean;
}

export enum QBEntityType {
  CUSTOMER = 'Customer',
  ITEM = 'Item', 
  INVOICE = 'Invoice',
  SALES_ORDER = 'SalesOrder',
  PURCHASE_ORDER = 'PurchaseOrder',
  VENDOR = 'Vendor',
  EMPLOYEE = 'Employee',
  PAYMENT = 'Payment',
  ACCOUNT = 'Account',
  TERMS = 'Terms',
  SALES_REP = 'SalesRep',
  CUSTOMER_TYPE = 'CustomerType',
  JOB_TYPE = 'JobType',
  PRICE_LEVEL = 'PriceLevel'
}

export enum QBOperation {
  QUERY = 'Query',
  ADD = 'Add',
  MOD = 'Mod',
  DEL = 'Del'
}

export interface QBXMLFilters {
  fromModifiedDate?: string;
  toModifiedDate?: string;
  listId?: string;
  fullName?: string;
  maxReturned?: number;
  activeStatus?: 'ActiveOnly' | 'InactiveOnly' | 'All';
  nameFilter?: {
    name?: string;
    matchCriterion?: 'StartsWith' | 'Contains' | 'EndsWith';
  };
}

// Generic QB Entity interface
export interface QBEntity {
  listId?: string;
  timeCreated?: string;
  timeModified?: string;
  editSequence?: string;
  name?: string;
  fullName?: string;
  isActive?: boolean;
  externalGUID?: string;
}

// Customer-specific interface extending QBEntity
export interface QBCustomer extends QBEntity {
  companyName?: string;
  salutation?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  billAddress?: QBAddress;
  shipAddress?: QBAddress;
  phone?: string;
  altPhone?: string;
  fax?: string;
  email?: string;
  contact?: string;
  altContact?: string;
  customerTypeRef?: QBReference;
  termsRef?: QBReference;
  salesRepRef?: QBReference;
  balance?: number;
  totalBalance?: number;
  salesTaxCodeRef?: QBReference;
  itemSalesTaxRef?: QBReference;
  creditLimit?: number;
  accountNumber?: string;
  creditCardInfo?: QBCreditCardInfo;
  jobStatus?: string;
  jobStartDate?: string;
  jobProjectedEndDate?: string;
  jobEndDate?: string;
  jobDesc?: string;
  jobTypeRef?: QBReference;
  notes?: string;
  isStatementWithParent?: boolean;
  deliveryMethod?: string;
  priceLevelRef?: QBReference;
}

export interface QBAddress {
  addr1?: string;
  addr2?: string;
  addr3?: string;
  addr4?: string;
  addr5?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  note?: string;
}

export interface QBReference {
  listId?: string;
  fullName?: string;
}

export interface QBCreditCardInfo {
  creditCardNumber?: string;
  expirationMonth?: number;
  expirationYear?: number;
  nameOnCard?: string;
  creditCardAddress?: string;
  creditCardPostalCode?: string;
}

// Item interface
export interface QBItem extends QBEntity {
  type?: 'Service' | 'Inventory' | 'NonInventory' | 'OtherCharge' | 'Subtotal' | 'Discount' | 'Payment' | 'Group' | 'Assembly';
  parentRef?: QBReference;
  unitOfMeasureSetRef?: QBReference;
  salesTaxCodeRef?: QBReference;
  salesOrPurchase?: {
    desc?: string;
    price?: number;
    pricePercent?: number;
    accountRef?: QBReference;
  };
  barcode?: {
    barCodeValue?: string;
    assignEvenIfUsed?: boolean;
    allowOverride?: boolean;
  };
  isTaxIncluded?: boolean;
  qtyOnHand?: number;
  totalValue?: number;
  inventoryDate?: string;
  averageCost?: number;
  quantityOnOrder?: number;
  quantityOnSalesOrder?: number;
  reorderPoint?: number;
  max?: number;
  preferredVendorRef?: QBReference;
}

// Invoice interface
export interface QBInvoice extends QBEntity {
  customerRef?: QBReference;
  classRef?: QBReference;
  templateRef?: QBReference;
  txnDate?: string;
  refNumber?: string;
  billAddress?: QBAddress;
  shipAddress?: QBAddress;
  isPending?: boolean;
  isFinanceCharge?: boolean;
  poNumber?: string;
  termsRef?: QBReference;
  dueDate?: string;
  salesRepRef?: QBReference;
  fob?: string;
  shipDate?: string;
  shipMethodRef?: QBReference;
  subtotal?: number;
  itemSalesTaxRef?: QBReference;
  salesTaxPercentage?: number;
  salesTaxTotal?: number;
  totalAmount?: number;
  customerMsgRef?: QBReference;
  isToBePrinted?: boolean;
  isToBeEmailed?: boolean;
  customerSalesTaxCodeRef?: QBReference;
  other?: string;
  memo?: string;
  invoiceLineItems?: QBInvoiceLineItem[];
}

export interface QBInvoiceLineItem {
  itemRef?: QBReference;
  desc?: string;
  quantity?: number;
  unitOfMeasure?: string;
  rate?: number;
  ratePercent?: number;
  amount?: number;
  customerRef?: QBReference;
  classRef?: QBReference;
  salesTaxCodeRef?: QBReference;
  isManuallyClosed?: boolean;
  other1?: string;
  other2?: string;
}

// QBXML Validation interfaces
export interface QBXMLValidationResult {
  isValid: boolean;
  errors: QBXMLValidationError[];
  warnings: QBXMLValidationWarning[];
}

export interface QBXMLValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'Error' | 'Critical';
}

export interface QBXMLValidationWarning {
  field: string;
  message: string;
  code: string;
}

// QBXML Processing interfaces
export interface QBXMLProcessingOptions {
  validateSchema?: boolean;
  transformData?: boolean;
  handleErrors?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface QBXMLProcessingResult<T = QBEntity> {
  success: boolean;
  data?: T[];
  errors: QBXMLValidationError[];
  warnings: QBXMLValidationWarning[];
  metadata: {
    requestId: string;
    entityType: QBEntityType;
    operation: QBOperation;
    processedAt: string;
    processingTimeMs: number;
    recordCount: number;
  };
}

// Error handling interfaces
export interface QBXMLError extends Error {
  code: string;
  qbErrorCode?: string;
  severity: 'Warning' | 'Error' | 'Critical';
  retryable: boolean;
  context?: {
    requestId?: string;
    entityType?: QBEntityType;
    operation?: QBOperation;
  };
}

export class QBXMLProcessingError extends Error implements QBXMLError {
  public code: string;
  public qbErrorCode?: string;
  public severity: 'Warning' | 'Error' | 'Critical';
  public retryable: boolean;
  public context?: {
    requestId?: string;
    entityType?: QBEntityType;
    operation?: QBOperation;
  };

  constructor(
    message: string,
    code: string,
    severity: 'Warning' | 'Error' | 'Critical' = 'Error',
    retryable = false,
    context?: any
  ) {
    super(message);
    this.name = 'QBXMLProcessingError';
    this.code = code;
    this.severity = severity;
    this.retryable = retryable;
    this.context = context;
  }
}