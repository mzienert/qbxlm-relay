import { XMLParser } from 'fast-xml-parser';
import {
  QBXMLValidationResult,
  QBEntityType,
  QBEntity,
  QBCustomer,
  QBItem,
  QBInvoice
} from './types';

export class QBXMLValidator {
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
   * Validates QBXML request structure and content
   */
  validateRequest(qbxmlString: string, expectedEntityType?: QBEntityType): QBXMLValidationResult {
    const result: QBXMLValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Parse XML structure
      const parsed = this.xmlParser.parse(qbxmlString);
      
      // Validate root structure
      this.validateRootStructure(parsed, result);
      
      if (!result.isValid) {
        return result;
      }

      // Extract request details
      const qbxml = parsed.QBXML;
      const msgsRq = qbxml.QBXMLMsgsRq;
      
      if (!msgsRq) {
        this.addError(result, 'structure', 'Missing QBXMLMsgsRq element', 'MISSING_MSGS_RQ');
        return result;
      }

      // Validate onError attribute
      this.validateOnErrorAttribute(msgsRq, result);

      // Validate individual requests
      this.validateRequestElements(msgsRq, result, expectedEntityType);

    } catch (error) {
      this.addError(result, 'xml', `Invalid XML: ${error instanceof Error ? error.message : String(error)}`, 'INVALID_XML');
    }

    return result;
  }

  /**
   * Validates QBXML response structure and content
   */
  validateResponse(qbxmlString: string, expectedEntityType?: QBEntityType): QBXMLValidationResult {
    const result: QBXMLValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Parse XML structure
      const parsed = this.xmlParser.parse(qbxmlString);
      
      // Validate root structure
      this.validateRootStructure(parsed, result);
      
      if (!result.isValid) {
        return result;
      }

      // Extract response details
      const qbxml = parsed.QBXML;
      const msgsRs = qbxml.QBXMLMsgsRs;
      
      if (!msgsRs) {
        this.addError(result, 'structure', 'Missing QBXMLMsgsRs element', 'MISSING_MSGS_RS');
        return result;
      }

      // Validate response elements
      this.validateResponseElements(msgsRs, result, expectedEntityType);

    } catch (error) {
      this.addError(result, 'xml', `Invalid XML: ${error instanceof Error ? error.message : String(error)}`, 'INVALID_XML');
    }

    return result;
  }

  /**
   * Validates entity data against QuickBooks field requirements
   */
  validateEntityData<T extends QBEntity>(entity: T, entityType: QBEntityType): QBXMLValidationResult {
    const result: QBXMLValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    switch (entityType) {
      case QBEntityType.CUSTOMER:
        this.validateCustomerData(entity as QBCustomer, result);
        break;
      case QBEntityType.ITEM:
        this.validateItemData(entity as QBItem, result);
        break;
      case QBEntityType.INVOICE:
        this.validateInvoiceData(entity as QBInvoice, result);
        break;
      default:
        this.validateBaseEntityData(entity, result);
    }

    return result;
  }

  /**
   * Validates field lengths according to QuickBooks limits
   */
  validateFieldLengths(data: any, entityType: QBEntityType): QBXMLValidationResult {
    const result: QBXMLValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const fieldLimits = this.getFieldLimits(entityType);
    
    for (const [field, limit] of Object.entries(fieldLimits)) {
      if (data[field] && typeof data[field] === 'string' && data[field].length > limit) {
        this.addError(
          result, 
          field, 
          `Field '${field}' exceeds maximum length of ${limit} characters`, 
          'FIELD_TOO_LONG'
        );
      }
    }

    return result;
  }

  private validateRootStructure(parsed: any, result: QBXMLValidationResult): void {
    if (!parsed.QBXML) {
      this.addError(result, 'structure', 'Missing QBXML root element', 'MISSING_ROOT');
      return;
    }

    // Check for XML declaration attributes if needed
    const qbxml = parsed.QBXML;
    if (typeof qbxml !== 'object') {
      this.addError(result, 'structure', 'Invalid QBXML structure', 'INVALID_STRUCTURE');
    }
  }

  private validateOnErrorAttribute(msgsRq: any, result: QBXMLValidationResult): void {
    const onError = msgsRq['@_onError'];
    if (onError && !['stopOnError', 'continueOnError'].includes(onError)) {
      this.addWarning(
        result, 
        'onError', 
        'onError attribute should be "stopOnError" or "continueOnError"', 
        'INVALID_ON_ERROR'
      );
    }
  }

  private validateRequestElements(msgsRq: any, result: QBXMLValidationResult, expectedEntityType?: QBEntityType): void {
    // Get all request elements
    const requests = this.extractRequestElements(msgsRq);
    
    if (requests.length === 0) {
      this.addError(result, 'requests', 'No request elements found', 'NO_REQUESTS');
      return;
    }

    for (const request of requests) {
      this.validateSingleRequest(request, result, expectedEntityType);
    }
  }

  private validateResponseElements(msgsRs: any, result: QBXMLValidationResult, _expectedEntityType?: QBEntityType): void {
    // Get all response elements
    const responses = this.extractResponseElements(msgsRs);
    
    if (responses.length === 0) {
      this.addError(result, 'responses', 'No response elements found', 'NO_RESPONSES');
      return;
    }

    for (const response of responses) {
      this.validateSingleResponse(response, result, _expectedEntityType);
    }
  }

  private validateSingleRequest(request: any, result: QBXMLValidationResult, expectedEntityType?: QBEntityType): void {
    const requestType = Object.keys(request)[0];
    const requestData = request[requestType];

    // Validate requestID
    const requestID = requestData['@_requestID'];
    if (!requestID) {
      this.addWarning(result, 'requestID', 'Missing requestID attribute', 'MISSING_REQUEST_ID');
    }

    // Validate entity type if expected
    if (expectedEntityType) {
      const entityType = this.extractEntityTypeFromRequest(requestType);
      if (entityType !== expectedEntityType) {
        this.addError(
          result, 
          'entityType', 
          `Expected ${expectedEntityType} request but got ${entityType}`, 
          'ENTITY_TYPE_MISMATCH'
        );
      }
    }

    // Validate operation-specific requirements
    this.validateRequestOperation(requestType, requestData, result);
  }

  private validateSingleResponse(response: any, result: QBXMLValidationResult, expectedEntityType?: QBEntityType): void {
    const responseType = Object.keys(response)[0];
    const responseData = response[responseType];

    // Validate status attributes
    const statusCode = responseData['@_statusCode'];
    const statusSeverity = responseData['@_statusSeverity'];
    const statusMessage = responseData['@_statusMessage'];

    if (statusCode === undefined) {
      this.addError(result, 'statusCode', 'Missing statusCode attribute', 'MISSING_STATUS_CODE');
    }

    if (!statusSeverity) {
      this.addError(result, 'statusSeverity', 'Missing statusSeverity attribute', 'MISSING_STATUS_SEVERITY');
    } else if (!['Info', 'Warn', 'Error'].includes(statusSeverity)) {
      this.addError(result, 'statusSeverity', 'Invalid statusSeverity value', 'INVALID_STATUS_SEVERITY');
    }

    // Check for error responses
    if (statusCode !== '0' && statusCode !== 0) {
      this.addWarning(
        result, 
        'response', 
        `Response contains error: ${statusMessage}`, 
        'RESPONSE_ERROR'
      );
    }
  }

  private validateCustomerData(customer: QBCustomer, result: QBXMLValidationResult): void {
    this.validateBaseEntityData(customer, result);

    // Customer-specific validations
    if (customer.email && !this.isValidEmail(customer.email)) {
      this.addError(result, 'email', 'Invalid email format', 'INVALID_EMAIL');
    }

    if (customer.phone && !this.isValidPhone(customer.phone)) {
      this.addWarning(result, 'phone', 'Phone number format may be invalid', 'INVALID_PHONE');
    }

    if (customer.creditLimit && customer.creditLimit < 0) {
      this.addError(result, 'creditLimit', 'Credit limit cannot be negative', 'NEGATIVE_CREDIT_LIMIT');
    }

    // Validate address if present
    if (customer.billAddress) {
      this.validateAddress(customer.billAddress, 'billAddress', result);
    }
    if (customer.shipAddress) {
      this.validateAddress(customer.shipAddress, 'shipAddress', result);
    }
  }

  private validateItemData(item: QBItem, result: QBXMLValidationResult): void {
    this.validateBaseEntityData(item, result);

    // Item-specific validations
    if (item.qtyOnHand !== undefined && item.qtyOnHand < 0) {
      this.addWarning(result, 'qtyOnHand', 'Negative quantity on hand', 'NEGATIVE_QTY');
    }

    if (item.salesOrPurchase?.price !== undefined && item.salesOrPurchase.price < 0) {
      this.addError(result, 'price', 'Price cannot be negative', 'NEGATIVE_PRICE');
    }
  }

  private validateInvoiceData(invoice: QBInvoice, result: QBXMLValidationResult): void {
    this.validateBaseEntityData(invoice, result);

    // Invoice-specific validations
    if (invoice.totalAmount !== undefined && invoice.totalAmount < 0) {
      this.addError(result, 'totalAmount', 'Total amount cannot be negative', 'NEGATIVE_TOTAL');
    }

    if (invoice.txnDate && !this.isValidDate(invoice.txnDate)) {
      this.addError(result, 'txnDate', 'Invalid transaction date format', 'INVALID_DATE');
    }

    if (invoice.dueDate && !this.isValidDate(invoice.dueDate)) {
      this.addError(result, 'dueDate', 'Invalid due date format', 'INVALID_DATE');
    }
  }

  private validateBaseEntityData(entity: QBEntity, result: QBXMLValidationResult): void {
    if (entity.timeCreated && !this.isValidDateTime(entity.timeCreated)) {
      this.addWarning(result, 'timeCreated', 'Invalid timeCreated format', 'INVALID_DATETIME');
    }

    if (entity.timeModified && !this.isValidDateTime(entity.timeModified)) {
      this.addWarning(result, 'timeModified', 'Invalid timeModified format', 'INVALID_DATETIME');
    }
  }

  private validateAddress(address: any, fieldName: string, result: QBXMLValidationResult): void {
    if (address.postalCode && !this.isValidPostalCode(address.postalCode)) {
      this.addWarning(result, `${fieldName}.postalCode`, 'Invalid postal code format', 'INVALID_POSTAL_CODE');
    }

    if (address.state && address.state.length > 3) {
      this.addWarning(result, `${fieldName}.state`, 'State should be 2-3 character abbreviation', 'INVALID_STATE');
    }
  }

  private validateRequestOperation(requestType: string, requestData: any, result: QBXMLValidationResult): void {
    if (requestType.endsWith('QueryRq')) {
      // Query-specific validations
      if (requestData.MaxReturned && (requestData.MaxReturned < 1 || requestData.MaxReturned > 1000)) {
        this.addWarning(
          result, 
          'MaxReturned', 
          'MaxReturned should be between 1 and 1000', 
          'INVALID_MAX_RETURNED'
        );
      }
    }
  }

  private extractRequestElements(msgsRq: any): any[] {
    const requests: any[] = [];
    
    for (const [key, value] of Object.entries(msgsRq)) {
      if (key.endsWith('Rq') && key !== '@_onError') {
        requests.push({ [key]: value });
      }
    }
    
    return requests;
  }

  private extractResponseElements(msgsRs: any): any[] {
    const responses: any[] = [];
    
    for (const [key, value] of Object.entries(msgsRs)) {
      if (key.endsWith('Rs')) {
        responses.push({ [key]: value });
      }
    }
    
    return responses;
  }

  private extractEntityTypeFromRequest(requestType: string): QBEntityType | null {
    const typeMapping: { [key: string]: QBEntityType } = {
      'CustomerQueryRq': QBEntityType.CUSTOMER,
      'CustomerAddRq': QBEntityType.CUSTOMER,
      'CustomerModRq': QBEntityType.CUSTOMER,
      'ItemQueryRq': QBEntityType.ITEM,
      'ItemAddRq': QBEntityType.ITEM,
      'InvoiceQueryRq': QBEntityType.INVOICE,
      'InvoiceAddRq': QBEntityType.INVOICE,
    };

    return typeMapping[requestType] || null;
  }

  private getFieldLimits(entityType: QBEntityType): { [field: string]: number } {
    const commonLimits = {
      name: 31,
      fullName: 159,
      notes: 4095
    };

    switch (entityType) {
      case QBEntityType.CUSTOMER:
        return {
          ...commonLimits,
          companyName: 41,
          firstName: 25,
          lastName: 25,
          phone: 21,
          email: 1023,
          accountNumber: 99
        };
      case QBEntityType.ITEM:
        return {
          ...commonLimits,
          salesOrPurchase: 4095
        };
      default:
        return commonLimits;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - can be enhanced
    const phoneRegex = /^[\d\s\-\(\)\+\.]{7,21}$/;
    return phoneRegex.test(phone);
  }

  private isValidDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(date) && !isNaN(Date.parse(date));
  }

  private isValidDateTime(dateTime: string): boolean {
    // ISO format or QuickBooks format
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    return isoRegex.test(dateTime) && !isNaN(Date.parse(dateTime));
  }

  private isValidPostalCode(postalCode: string): boolean {
    // US ZIP code (5 or 9 digits) or international postal code
    const zipRegex = /^(\d{5}(-\d{4})?|[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d|\d{4,10})$/;
    return zipRegex.test(postalCode);
  }

  private addError(result: QBXMLValidationResult, field: string, message: string, code: string): void {
    result.errors.push({
      field,
      message,
      code,
      severity: 'Error'
    });
    result.isValid = false;
  }

  private addWarning(result: QBXMLValidationResult, field: string, message: string, code: string): void {
    result.warnings.push({
      field,
      message,
      code
    });
  }
}