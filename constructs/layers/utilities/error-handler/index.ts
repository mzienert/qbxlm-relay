import {
  QBXMLError,
  QBXMLProcessingError,
  QBEntityType,
  QBOperation,
  QBXMLProcessingResult
} from '../../../../lambda/qbwc-handler/types';

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrorCodes: string[];
  jitterEnabled: boolean;
}

export interface ErrorContext {
  requestId?: string;
  entityType?: QBEntityType;
  operation?: QBOperation;
  attempt?: number;
  totalAttempts?: number;
  originalError?: Error;
  timestamp: string;
  sessionId?: string;
}

export class QBXMLErrorHandler {
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrorCodes: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'TEMPORARY_UNAVAILABLE',
      'RATE_LIMIT',
      'QB_BUSY',
      'CONNECTION_LOST',
      'SERVER_ERROR'
    ],
    jitterEnabled: true
  };

  constructor(private retryOptions: Partial<RetryOptions> = {}) {
    this.retryOptions = { ...this.defaultRetryOptions, ...retryOptions };
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    customRetryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    const options = { ...this.retryOptions, ...customRetryOptions } as RetryOptions;
    const fullContext: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      totalAttempts: options.maxRetries + 1
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      fullContext.attempt = attempt + 1;

      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const qbError = this.enhanceError(lastError, fullContext);

        // Log the error
        this.logError(qbError, fullContext);

        // Check if we should retry
        if (attempt < options.maxRetries && this.shouldRetry(qbError, options)) {
          const delay = this.calculateDelay(attempt, options);
          console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${options.maxRetries + 1})`);
          await this.sleep(delay);
          continue;
        }

        // No more retries or non-retryable error
        throw qbError;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw this.enhanceError(lastError || new Error('Unknown error'), fullContext);
  }

  /**
   * Enhanced error classification and handling
   */
  classifyError(error: Error, context: Partial<ErrorContext> = {}): QBXMLError {
    const qbError = this.enhanceError(error, context);

    // QBXML-specific error classification
    if (this.isQuickBooksError(error)) {
      return this.classifyQuickBooksError(error, context);
    }

    // Network/Connection errors
    if (this.isNetworkError(error)) {
      qbError.code = 'NETWORK_ERROR';
      qbError.severity = 'Error';
      qbError.retryable = true;
      return qbError;
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      qbError.code = 'TIMEOUT';
      qbError.severity = 'Error';
      qbError.retryable = true;
      return qbError;
    }

    // Parsing errors
    if (this.isParsingError(error)) {
      qbError.code = 'PARSING_ERROR';
      qbError.severity = 'Error';
      qbError.retryable = false;
      return qbError;
    }

    // Validation errors
    if (this.isValidationError(error)) {
      qbError.code = 'VALIDATION_ERROR';
      qbError.severity = 'Error';
      qbError.retryable = false;
      return qbError;
    }

    // Authentication errors
    if (this.isAuthenticationError(error)) {
      qbError.code = 'AUTHENTICATION_ERROR';
      qbError.severity = 'Critical';
      qbError.retryable = false;
      return qbError;
    }

    // Default classification
    qbError.code = 'UNKNOWN_ERROR';
    qbError.severity = 'Error';
    qbError.retryable = false;
    return qbError;
  }

  /**
   * Classify QuickBooks-specific errors
   */
  private classifyQuickBooksError(error: Error, context: Partial<ErrorContext>): QBXMLError {
    const qbError = this.enhanceError(error, context);
    const errorMessage = error.message.toLowerCase();

    // Extract QB error code if present
    const qbErrorCodeMatch = error.message.match(/error(?:\s+code)?:?\s*([0-9a-fx]+)/i);
    if (qbErrorCodeMatch) {
      qbError.qbErrorCode = qbErrorCodeMatch[1];
    }

    // Common QuickBooks error patterns
    const errorPatterns: Array<{
      pattern: RegExp;
      code: string;
      severity: 'Warning' | 'Error' | 'Critical';
      retryable: boolean;
    }> = [
      // Application busy
      { pattern: /application.*busy|company.*file.*use/i, code: 'QB_BUSY', severity: 'Error', retryable: true },
      
      // Company file errors
      { pattern: /company.*file.*not.*found|no.*company.*file/i, code: 'COMPANY_FILE_NOT_FOUND', severity: 'Critical', retryable: false },
      { pattern: /company.*file.*corrupt/i, code: 'COMPANY_FILE_CORRUPT', severity: 'Critical', retryable: false },
      
      // Permission errors
      { pattern: /access.*denied|permission.*denied|unauthorized/i, code: 'ACCESS_DENIED', severity: 'Critical', retryable: false },
      
      // Data errors
      { pattern: /duplicate.*name|name.*already.*exists/i, code: 'DUPLICATE_NAME', severity: 'Error', retryable: false },
      { pattern: /record.*not.*found|invalid.*reference/i, code: 'RECORD_NOT_FOUND', severity: 'Error', retryable: false },
      { pattern: /invalid.*data|data.*format/i, code: 'INVALID_DATA', severity: 'Error', retryable: false },
      
      // Connection errors
      { pattern: /connection.*lost|connection.*timeout/i, code: 'CONNECTION_LOST', severity: 'Error', retryable: true },
      { pattern: /qbwc.*not.*running|web.*connector.*not/i, code: 'QBWC_NOT_RUNNING', severity: 'Critical', retryable: false },
      
      // Version/compatibility errors
      { pattern: /version.*mismatch|unsupported.*version/i, code: 'VERSION_MISMATCH', severity: 'Critical', retryable: false },
      { pattern: /feature.*not.*supported/i, code: 'FEATURE_NOT_SUPPORTED', severity: 'Error', retryable: false },
      
      // Rate limiting
      { pattern: /too.*many.*requests|rate.*limit/i, code: 'RATE_LIMIT', severity: 'Warning', retryable: true }
    ];

    for (const { pattern, code, severity, retryable } of errorPatterns) {
      if (pattern.test(errorMessage)) {
        qbError.code = code;
        qbError.severity = severity;
        qbError.retryable = retryable;
        return qbError;
      }
    }

    // Default QB error classification
    qbError.code = 'QB_ERROR';
    qbError.severity = 'Error';
    qbError.retryable = false;
    return qbError;
  }

  /**
   * Create standardized error response
   */
  createErrorResponse<T>(
    error: QBXMLError,
    context: Partial<ErrorContext> = {}
  ): QBXMLProcessingResult<T> {
    return {
      success: false,
      data: [],
      errors: [{
        field: 'processing',
        message: error.message,
        code: error.code,
        severity: error.severity === 'Critical' ? 'Critical' : 'Error'
      }],
      warnings: error.severity === 'Warning' ? [{
        field: 'processing',
        message: error.message,
        code: error.code
      }] : [],
      metadata: {
        requestId: context.requestId || '',
        entityType: context.entityType || QBEntityType.CUSTOMER,
        operation: context.operation || QBOperation.QUERY,
        processedAt: new Date().toISOString(),
        processingTimeMs: 0,
        recordCount: 0
      }
    };
  }

  /**
   * Handle batch processing errors
   */
  async processBatch<T>(
    items: any[],
    processor: (item: any, index: number) => Promise<T>,
    batchOptions: {
      continueOnError?: boolean;
      maxConcurrent?: number;
      context?: Partial<ErrorContext>;
    } = {}
  ): Promise<{
    results: T[];
    errors: Array<{ index: number; error: QBXMLError; item: any }>;
    successCount: number;
    errorCount: number;
  }> {
    const {
      continueOnError = true,
      maxConcurrent = 5,
      context = {}
    } = batchOptions;

    const results: T[] = [];
    const errors: Array<{ index: number; error: QBXMLError; item: any }> = [];
    
    // Process items in batches to avoid overwhelming the system
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const batch = items.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          const result = await this.executeWithRetry(
            () => processor(item, actualIndex),
            { ...context, requestId: `batch-${actualIndex}` }
          );
          return { index: actualIndex, result, error: null };
        } catch (error) {
          const qbError = this.classifyError(
            error instanceof Error ? error : new Error(String(error)),
            context
          );
          
          if (!continueOnError) {
            throw qbError;
          }
          
          return { index: actualIndex, result: null, error: qbError };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { index, result, error } of batchResults) {
        if (error) {
          errors.push({ index, error, item: items[index] });
        } else if (result !== null) {
          results[index] = result;
        }
      }
    }

    return {
      results: results.filter(r => r !== undefined),
      errors,
      successCount: results.length,
      errorCount: errors.length
    };
  }

  /**
   * Helper methods for error classification
   */
  private isQuickBooksError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('quickbooks') ||
           message.includes('qbxml') ||
           message.includes('qbwc') ||
           /error\s*code?\s*[0-9a-fx]+/i.test(error.message);
  }

  private isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('connection') ||
           message.includes('dns') ||
           message.includes('host') ||
           message.includes('socket');
  }

  private isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('timeout') ||
           message.includes('timed out') ||
           message.includes('deadline exceeded');
  }

  private isParsingError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('parse') ||
           message.includes('xml') ||
           message.includes('syntax') ||
           message.includes('malformed');
  }

  private isValidationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('validation') ||
           message.includes('invalid') ||
           message.includes('required') ||
           message.includes('format');
  }

  private isAuthenticationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('authentication') ||
           message.includes('unauthorized') ||
           message.includes('invalid credentials') ||
           message.includes('access denied');
  }

  private enhanceError(error: Error, context: Partial<ErrorContext>): QBXMLProcessingError {
    if (error instanceof QBXMLProcessingError) {
      // Update context if provided
      if (context.requestId || context.entityType || context.operation) {
        error.context = { ...error.context, ...context };
      }
      return error;
    }

    return new QBXMLProcessingError(
      error.message,
      'UNKNOWN_ERROR',
      'Error',
      false,
      {
        requestId: context.requestId,
        entityType: context.entityType,
        operation: context.operation
      }
    );
  }

  private shouldRetry(error: QBXMLError, options: RetryOptions): boolean {
    if (!error.retryable) {
      return false;
    }

    return options.retryableErrorCodes.includes(error.code);
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
    delay = Math.min(delay, options.maxDelayMs);

    // Add jitter to prevent thundering herd
    if (options.jitterEnabled) {
      delay += Math.random() * 1000;
    }

    return Math.floor(delay);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logError(error: QBXMLError, context: ErrorContext): void {
    const logData = {
      error: {
        message: error.message,
        code: error.code,
        qbErrorCode: error.qbErrorCode,
        severity: error.severity,
        retryable: error.retryable
      },
      context: {
        requestId: context.requestId,
        entityType: context.entityType,
        operation: context.operation,
        attempt: context.attempt,
        totalAttempts: context.totalAttempts,
        timestamp: context.timestamp,
        sessionId: context.sessionId
      }
    };

    if (error.severity === 'Critical') {
      console.error('CRITICAL QBXML Error:', JSON.stringify(logData, null, 2));
    } else if (error.severity === 'Error') {
      console.error('QBXML Error:', JSON.stringify(logData, null, 2));
    } else {
      console.warn('QBXML Warning:', JSON.stringify(logData, null, 2));
    }
  }
}