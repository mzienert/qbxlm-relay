import { XMLParser } from 'fast-xml-parser';
import {
  QBXMLProcessingResult,
  QBXMLProcessingOptions,
  QBEntityType,
  QBOperation,
  QBEntity,
  QBCustomer,
  QBItem,
  QBInvoice,
  QBAddress,
  QBReference,
  QBCreditCardInfo,
  QBInvoiceLineItem,
  QBXMLProcessingError
} from '../../../../lambda/qbwc-handler/types';

export interface TransformedData<T = any> {
  originalData: any;
  transformedData: T;
  metadata: {
    entityType: QBEntityType;
    transformedAt: string;
    transformationVersion: string;
  };
}

export class QBXMLTransformer {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true
    });
  }

  /**
   * Main transformation method - processes QBXML response into structured data
   */
  async transformQBXMLResponse<T extends QBEntity = QBEntity>(
    qbxmlString: string,
    _options: QBXMLProcessingOptions = {}
  ): Promise<QBXMLProcessingResult<T>> {
    const startTime = Date.now();
    const result: QBXMLProcessingResult<T> = {
      success: false,
      data: [],
      errors: [],
      warnings: [],
      metadata: {
        requestId: '',
        entityType: QBEntityType.CUSTOMER, // Default, will be updated
        operation: QBOperation.QUERY,
        processedAt: new Date().toISOString(),
        processingTimeMs: 0,
        recordCount: 0
      }
    };

    try {
      // Parse XML
      const parsed = this.xmlParser.parse(qbxmlString);
      const qbxmlResponse = this.extractQBXMLResponse(parsed);

      if (!qbxmlResponse) {
        throw new QBXMLProcessingError(
          'Invalid QBXML response structure',
          'INVALID_STRUCTURE',
          'Error',
          false
        );
      }

      // Extract response details
      const responseInfo = this.extractResponseInfo(qbxmlResponse);
      result.metadata.requestId = responseInfo.requestId;
      result.metadata.entityType = responseInfo.entityType;
      result.metadata.operation = responseInfo.operation;

      // Check for errors in response
      if (responseInfo.statusCode !== '0' && responseInfo.statusCode !== 0) {
        result.errors.push({
          field: 'response',
          message: responseInfo.statusMessage || 'Unknown error',
          code: responseInfo.statusCode.toString(),
          severity: 'Error'
        });
        result.success = false;
        return result;
      }

      // Transform entities based on type
      const entities = this.extractEntities(qbxmlResponse, responseInfo.entityType);
      result.data = entities.map(entity => 
        this.transformEntity(entity, responseInfo.entityType)
      ) as T[];

      result.metadata.recordCount = result.data.length;
      result.success = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({
        field: 'transformation',
        message: errorMessage,
        code: 'TRANSFORMATION_ERROR',
        severity: 'Error'
      });
    } finally {
      result.metadata.processingTimeMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Transform individual entity based on type
   */
  transformEntity<T extends QBEntity>(rawEntity: any, entityType: QBEntityType): T {
    switch (entityType) {
      case QBEntityType.CUSTOMER:
        return this.transformCustomer(rawEntity) as T;
      case QBEntityType.ITEM:
        return this.transformItem(rawEntity) as T;
      case QBEntityType.INVOICE:
        return this.transformInvoice(rawEntity) as T;
      default:
        return this.transformBaseEntity(rawEntity) as T;
    }
  }

  /**
   * Transform Customer entity
   */
  private transformCustomer(rawCustomer: any): QBCustomer {
    const customer: QBCustomer = {
      ...this.transformBaseEntity(rawCustomer),
      companyName: this.extractText(rawCustomer.CompanyName),
      salutation: this.extractText(rawCustomer.Salutation),
      firstName: this.extractText(rawCustomer.FirstName),
      middleName: this.extractText(rawCustomer.MiddleName),
      lastName: this.extractText(rawCustomer.LastName),
      phone: this.extractText(rawCustomer.Phone),
      altPhone: this.extractText(rawCustomer.AltPhone),
      fax: this.extractText(rawCustomer.Fax),
      email: this.extractText(rawCustomer.Email),
      contact: this.extractText(rawCustomer.Contact),
      altContact: this.extractText(rawCustomer.AltContact),
      balance: this.extractNumber(rawCustomer.Balance),
      totalBalance: this.extractNumber(rawCustomer.TotalBalance),
      creditLimit: this.extractNumber(rawCustomer.CreditLimit),
      accountNumber: this.extractText(rawCustomer.AccountNumber),
      jobStatus: this.extractText(rawCustomer.JobStatus),
      jobStartDate: this.extractText(rawCustomer.JobStartDate),
      jobProjectedEndDate: this.extractText(rawCustomer.JobProjectedEndDate),
      jobEndDate: this.extractText(rawCustomer.JobEndDate),
      jobDesc: this.extractText(rawCustomer.JobDesc),
      notes: this.extractText(rawCustomer.Notes),
      isStatementWithParent: this.extractBoolean(rawCustomer.IsStatementWithParent),
      deliveryMethod: this.extractText(rawCustomer.DeliveryMethod)
    };

    // Transform complex nested objects
    if (rawCustomer.BillAddress) {
      customer.billAddress = this.transformAddress(rawCustomer.BillAddress);
    }

    if (rawCustomer.ShipAddress) {
      customer.shipAddress = this.transformAddress(rawCustomer.ShipAddress);
    }

    if (rawCustomer.CustomerTypeRef) {
      customer.customerTypeRef = this.transformReference(rawCustomer.CustomerTypeRef);
    }

    if (rawCustomer.TermsRef) {
      customer.termsRef = this.transformReference(rawCustomer.TermsRef);
    }

    if (rawCustomer.SalesRepRef) {
      customer.salesRepRef = this.transformReference(rawCustomer.SalesRepRef);
    }

    if (rawCustomer.SalesTaxCodeRef) {
      customer.salesTaxCodeRef = this.transformReference(rawCustomer.SalesTaxCodeRef);
    }

    if (rawCustomer.ItemSalesTaxRef) {
      customer.itemSalesTaxRef = this.transformReference(rawCustomer.ItemSalesTaxRef);
    }

    if (rawCustomer.JobTypeRef) {
      customer.jobTypeRef = this.transformReference(rawCustomer.JobTypeRef);
    }

    if (rawCustomer.PriceLevelRef) {
      customer.priceLevelRef = this.transformReference(rawCustomer.PriceLevelRef);
    }

    if (rawCustomer.CreditCardInfo) {
      customer.creditCardInfo = this.transformCreditCardInfo(rawCustomer.CreditCardInfo);
    }

    return customer;
  }

  /**
   * Transform Item entity
   */
  private transformItem(rawItem: any): QBItem {
    const item: QBItem = {
      ...this.transformBaseEntity(rawItem),
      type: this.extractText(rawItem.Type) as 'Service' | 'Inventory' | 'NonInventory' | 'OtherCharge' | 'Subtotal' | 'Discount' | 'Payment' | 'Group' | 'Assembly' | undefined,
      isTaxIncluded: this.extractBoolean(rawItem.IsTaxIncluded),
      qtyOnHand: this.extractNumber(rawItem.QtyOnHand),
      totalValue: this.extractNumber(rawItem.TotalValue),
      inventoryDate: this.extractText(rawItem.InventoryDate),
      averageCost: this.extractNumber(rawItem.AverageCost),
      quantityOnOrder: this.extractNumber(rawItem.QuantityOnOrder),
      quantityOnSalesOrder: this.extractNumber(rawItem.QuantityOnSalesOrder),
      reorderPoint: this.extractNumber(rawItem.ReorderPoint),
      max: this.extractNumber(rawItem.Max)
    };

    // Transform nested objects
    if (rawItem.ParentRef) {
      item.parentRef = this.transformReference(rawItem.ParentRef);
    }

    if (rawItem.UnitOfMeasureSetRef) {
      item.unitOfMeasureSetRef = this.transformReference(rawItem.UnitOfMeasureSetRef);
    }

    if (rawItem.SalesTaxCodeRef) {
      item.salesTaxCodeRef = this.transformReference(rawItem.SalesTaxCodeRef);
    }

    if (rawItem.PreferredVendorRef) {
      item.preferredVendorRef = this.transformReference(rawItem.PreferredVendorRef);
    }

    if (rawItem.SalesOrPurchase) {
      item.salesOrPurchase = {
        desc: this.extractText(rawItem.SalesOrPurchase.Desc),
        price: this.extractNumber(rawItem.SalesOrPurchase.Price),
        pricePercent: this.extractNumber(rawItem.SalesOrPurchase.PricePercent),
        accountRef: rawItem.SalesOrPurchase.AccountRef ? 
          this.transformReference(rawItem.SalesOrPurchase.AccountRef) : undefined
      };
    }

    if (rawItem.Barcode) {
      item.barcode = {
        barCodeValue: this.extractText(rawItem.Barcode.BarCodeValue),
        assignEvenIfUsed: this.extractBoolean(rawItem.Barcode.AssignEvenIfUsed),
        allowOverride: this.extractBoolean(rawItem.Barcode.AllowOverride)
      };
    }

    return item;
  }

  /**
   * Transform Invoice entity
   */
  private transformInvoice(rawInvoice: any): QBInvoice {
    const invoice: QBInvoice = {
      ...this.transformBaseEntity(rawInvoice),
      txnDate: this.extractText(rawInvoice.TxnDate),
      refNumber: this.extractText(rawInvoice.RefNumber),
      isPending: this.extractBoolean(rawInvoice.IsPending),
      isFinanceCharge: this.extractBoolean(rawInvoice.IsFinanceCharge),
      poNumber: this.extractText(rawInvoice.PONumber),
      dueDate: this.extractText(rawInvoice.DueDate),
      fob: this.extractText(rawInvoice.FOB),
      shipDate: this.extractText(rawInvoice.ShipDate),
      subtotal: this.extractNumber(rawInvoice.Subtotal),
      salesTaxPercentage: this.extractNumber(rawInvoice.SalesTaxPercentage),
      salesTaxTotal: this.extractNumber(rawInvoice.SalesTaxTotal),
      totalAmount: this.extractNumber(rawInvoice.TotalAmount),
      isToBePrinted: this.extractBoolean(rawInvoice.IsToBePrinted),
      isToBeEmailed: this.extractBoolean(rawInvoice.IsToBeEmailed),
      other: this.extractText(rawInvoice.Other),
      memo: this.extractText(rawInvoice.Memo)
    };

    // Transform references
    if (rawInvoice.CustomerRef) {
      invoice.customerRef = this.transformReference(rawInvoice.CustomerRef);
    }

    if (rawInvoice.ClassRef) {
      invoice.classRef = this.transformReference(rawInvoice.ClassRef);
    }

    if (rawInvoice.TemplateRef) {
      invoice.templateRef = this.transformReference(rawInvoice.TemplateRef);
    }

    if (rawInvoice.TermsRef) {
      invoice.termsRef = this.transformReference(rawInvoice.TermsRef);
    }

    if (rawInvoice.SalesRepRef) {
      invoice.salesRepRef = this.transformReference(rawInvoice.SalesRepRef);
    }

    if (rawInvoice.ShipMethodRef) {
      invoice.shipMethodRef = this.transformReference(rawInvoice.ShipMethodRef);
    }

    if (rawInvoice.ItemSalesTaxRef) {
      invoice.itemSalesTaxRef = this.transformReference(rawInvoice.ItemSalesTaxRef);
    }

    if (rawInvoice.CustomerMsgRef) {
      invoice.customerMsgRef = this.transformReference(rawInvoice.CustomerMsgRef);
    }

    if (rawInvoice.CustomerSalesTaxCodeRef) {
      invoice.customerSalesTaxCodeRef = this.transformReference(rawInvoice.CustomerSalesTaxCodeRef);
    }

    // Transform addresses
    if (rawInvoice.BillAddress) {
      invoice.billAddress = this.transformAddress(rawInvoice.BillAddress);
    }

    if (rawInvoice.ShipAddress) {
      invoice.shipAddress = this.transformAddress(rawInvoice.ShipAddress);
    }

    // Transform line items
    if (rawInvoice.InvoiceLineRet) {
      const lineItems = Array.isArray(rawInvoice.InvoiceLineRet) 
        ? rawInvoice.InvoiceLineRet 
        : [rawInvoice.InvoiceLineRet];
      
      invoice.invoiceLineItems = lineItems.map((lineItem: any) => this.transformInvoiceLineItem(lineItem));
    }

    return invoice;
  }

  /**
   * Transform base entity properties common to all QB entities
   */
  private transformBaseEntity(rawEntity: any): QBEntity {
    return {
      listId: this.extractText(rawEntity.ListID),
      timeCreated: this.extractText(rawEntity.TimeCreated),
      timeModified: this.extractText(rawEntity.TimeModified),
      editSequence: this.extractText(rawEntity.EditSequence),
      name: this.extractText(rawEntity.Name),
      fullName: this.extractText(rawEntity.FullName),
      isActive: this.extractBoolean(rawEntity.IsActive, true), // Default to true if not specified
      externalGUID: this.extractText(rawEntity.ExternalGUID)
    };
  }

  /**
   * Transform Address object
   */
  private transformAddress(rawAddress: any): QBAddress {
    return {
      addr1: this.extractText(rawAddress.Addr1),
      addr2: this.extractText(rawAddress.Addr2),
      addr3: this.extractText(rawAddress.Addr3),
      addr4: this.extractText(rawAddress.Addr4),
      addr5: this.extractText(rawAddress.Addr5),
      city: this.extractText(rawAddress.City),
      state: this.extractText(rawAddress.State),
      postalCode: this.extractText(rawAddress.PostalCode),
      country: this.extractText(rawAddress.Country),
      note: this.extractText(rawAddress.Note)
    };
  }

  /**
   * Transform Reference object (ListID + FullName pattern)
   */
  private transformReference(rawRef: any): QBReference {
    return {
      listId: this.extractText(rawRef.ListID),
      fullName: this.extractText(rawRef.FullName)
    };
  }

  /**
   * Transform Credit Card Info object
   */
  private transformCreditCardInfo(rawCreditCard: any): QBCreditCardInfo {
    return {
      creditCardNumber: this.extractText(rawCreditCard.CreditCardNumber),
      expirationMonth: this.extractNumber(rawCreditCard.ExpirationMonth),
      expirationYear: this.extractNumber(rawCreditCard.ExpirationYear),
      nameOnCard: this.extractText(rawCreditCard.NameOnCard),
      creditCardAddress: this.extractText(rawCreditCard.CreditCardAddress),
      creditCardPostalCode: this.extractText(rawCreditCard.CreditCardPostalCode)
    };
  }

  /**
   * Transform Invoice Line Item
   */
  private transformInvoiceLineItem(rawLineItem: any): QBInvoiceLineItem {
    const lineItem: QBInvoiceLineItem = {
      desc: this.extractText(rawLineItem.Desc),
      quantity: this.extractNumber(rawLineItem.Quantity),
      unitOfMeasure: this.extractText(rawLineItem.UnitOfMeasure),
      rate: this.extractNumber(rawLineItem.Rate),
      ratePercent: this.extractNumber(rawLineItem.RatePercent),
      amount: this.extractNumber(rawLineItem.Amount),
      isManuallyClosed: this.extractBoolean(rawLineItem.IsManuallyClosed),
      other1: this.extractText(rawLineItem.Other1),
      other2: this.extractText(rawLineItem.Other2)
    };

    // Transform references
    if (rawLineItem.ItemRef) {
      lineItem.itemRef = this.transformReference(rawLineItem.ItemRef);
    }

    if (rawLineItem.CustomerRef) {
      lineItem.customerRef = this.transformReference(rawLineItem.CustomerRef);
    }

    if (rawLineItem.ClassRef) {
      lineItem.classRef = this.transformReference(rawLineItem.ClassRef);
    }

    if (rawLineItem.SalesTaxCodeRef) {
      lineItem.salesTaxCodeRef = this.transformReference(rawLineItem.SalesTaxCodeRef);
    }

    return lineItem;
  }

  /**
   * Helper methods for data extraction
   */
  private extractQBXMLResponse(parsed: any): any {
    if (!parsed.QBXML?.QBXMLMsgsRs) {
      return null;
    }
    return parsed.QBXML.QBXMLMsgsRs;
  }

  private extractResponseInfo(qbxmlResponse: any): {
    requestId: string;
    entityType: QBEntityType;
    operation: QBOperation;
    statusCode: string | number;
    statusMessage: string;
  } {
    // Find the first response element
    const responseKeys = Object.keys(qbxmlResponse).filter(key => key.endsWith('Rs'));
    if (responseKeys.length === 0) {
      throw new QBXMLProcessingError('No response elements found', 'NO_RESPONSE_ELEMENTS');
    }

    const responseKey = responseKeys[0];
    const responseData = qbxmlResponse[responseKey];

    return {
      requestId: responseData['@_requestID'] || '',
      entityType: this.getEntityTypeFromResponse(responseKey),
      operation: this.getOperationFromResponse(responseKey),
      statusCode: responseData['@_statusCode'] || '0',
      statusMessage: responseData['@_statusMessage'] || ''
    };
  }

  private extractEntities(qbxmlResponse: any, entityType: QBEntityType): any[] {
    const entitySuffix = this.getEntitySuffix(entityType);
    const entities: any[] = [];

    // Look for entity return elements
    for (const [key, value] of Object.entries(qbxmlResponse)) {
      if (key.endsWith('Rs') && value) {
        const responseData = value as any;
        const retKey = `${entitySuffix}Ret`;
        
        if (responseData[retKey]) {
          const entityData = responseData[retKey];
          // Handle both single entity and array of entities
          if (Array.isArray(entityData)) {
            entities.push(...entityData);
          } else {
            entities.push(entityData);
          }
        }
      }
    }

    return entities;
  }

  private getEntityTypeFromResponse(responseKey: string): QBEntityType {
    const typeMapping: { [key: string]: QBEntityType } = {
      'CustomerQueryRs': QBEntityType.CUSTOMER,
      'ItemQueryRs': QBEntityType.ITEM,
      'InvoiceQueryRs': QBEntityType.INVOICE,
      'VendorQueryRs': QBEntityType.VENDOR,
      'EmployeeQueryRs': QBEntityType.EMPLOYEE
    };

    return typeMapping[responseKey] || QBEntityType.CUSTOMER;
  }

  private getOperationFromResponse(responseKey: string): QBOperation {
    if (responseKey.includes('Query')) return QBOperation.QUERY;
    if (responseKey.includes('Add')) return QBOperation.ADD;
    if (responseKey.includes('Mod')) return QBOperation.MOD;
    if (responseKey.includes('Del')) return QBOperation.DEL;
    return QBOperation.QUERY;
  }

  private getEntitySuffix(entityType: QBEntityType): string {
    const suffixMapping: { [key in QBEntityType]: string } = {
      [QBEntityType.CUSTOMER]: 'Customer',
      [QBEntityType.ITEM]: 'Item',
      [QBEntityType.INVOICE]: 'Invoice',
      [QBEntityType.SALES_ORDER]: 'SalesOrder',
      [QBEntityType.PURCHASE_ORDER]: 'PurchaseOrder',
      [QBEntityType.VENDOR]: 'Vendor',
      [QBEntityType.EMPLOYEE]: 'Employee',
      [QBEntityType.PAYMENT]: 'Payment',
      [QBEntityType.ACCOUNT]: 'Account',
      [QBEntityType.TERMS]: 'Terms',
      [QBEntityType.SALES_REP]: 'SalesRep',
      [QBEntityType.CUSTOMER_TYPE]: 'CustomerType',
      [QBEntityType.JOB_TYPE]: 'JobType',
      [QBEntityType.PRICE_LEVEL]: 'PriceLevel'
    };

    return suffixMapping[entityType];
  }

  private extractText(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'object' && value['#text']) return value['#text'].trim() || undefined;
    return String(value).trim() || undefined;
  }

  private extractNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    if (typeof value === 'object' && value['#text']) {
      const num = parseFloat(value['#text']);
      return isNaN(num) ? undefined : num;
    }
    const num = parseFloat(String(value));
    return isNaN(num) ? undefined : num;
  }

  private extractBoolean(value: any, defaultValue?: boolean): boolean | undefined {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
      return defaultValue;
    }
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'object' && value['#text']) {
      return this.extractBoolean(value['#text'], defaultValue);
    }
    return defaultValue;
  }
}