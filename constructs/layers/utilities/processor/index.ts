import { QBXMLValidator } from '../validator';
import { QBXMLTransformer } from '../transformer';
import { QBXMLErrorHandler } from '../error-handler';
import {
  QBXMLProcessingResult,
  QBXMLProcessingOptions,
  QBEntityType,
  QBOperation,
  QBEntity,
  QBXMLProcessingError
} from '../../../../lambda/qbwc-handler/types';

export interface QBXMLProcessorConfig {
  validationEnabled: boolean;
  transformationEnabled: boolean;
  errorHandlingEnabled: boolean;
  retryOptions?: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffMultiplier?: number;
  };
}

export class QBXMLProcessor {
  private validator: QBXMLValidator;
  private transformer: QBXMLTransformer;
  private errorHandler: QBXMLErrorHandler;
  private config: QBXMLProcessorConfig;

  constructor(config: Partial<QBXMLProcessorConfig> = {}) {
    this.config = {
      validationEnabled: true,
      transformationEnabled: true,
      errorHandlingEnabled: true,
      ...config
    };

    this.validator = new QBXMLValidator();
    this.transformer = new QBXMLTransformer();
    this.errorHandler = new QBXMLErrorHandler(this.config.retryOptions);
  }

  /**
   * Process QBXML response with full pipeline: validation, transformation, error handling
   */
  async processQBXMLResponse<T extends QBEntity = QBEntity>(
    qbxmlString: string,
    expectedEntityType?: QBEntityType,
    options: QBXMLProcessingOptions = {}
  ): Promise<QBXMLProcessingResult<T>> {
    const context = {
      entityType: expectedEntityType,
      operation: QBOperation.QUERY,
      requestId: options.validateSchema ? `validate-${Date.now()}` : `process-${Date.now()}`
    };

    if (this.config.errorHandlingEnabled) {
      return this.errorHandler.executeWithRetry(
        () => this.processInternal<T>(qbxmlString, expectedEntityType, options),
        context,
        {
          maxRetries: options.maxRetries,
          retryableErrorCodes: ['NETWORK_ERROR', 'TIMEOUT', 'QB_BUSY']
        }
      );
    } else {
      return this.processInternal<T>(qbxmlString, expectedEntityType, options);
    }
  }

  /**
   * Process QBXML request for validation before sending to QuickBooks
   */
  async processQBXMLRequest(
    qbxmlString: string,
    expectedEntityType?: QBEntityType,
    options: QBXMLProcessingOptions = {}
  ): Promise<QBXMLProcessingResult> {
    const result: QBXMLProcessingResult = {
      success: false,
      data: [],
      errors: [],
      warnings: [],
      metadata: {
        requestId: `request-${Date.now()}`,
        entityType: expectedEntityType || QBEntityType.CUSTOMER,
        operation: QBOperation.QUERY,
        processedAt: new Date().toISOString(),
        processingTimeMs: 0,
        recordCount: 0
      }
    };

    const startTime = Date.now();

    try {
      if (this.config.validationEnabled && options.validateSchema !== false) {
        console.log('Validating QBXML request...');
        const validationResult = this.validator.validateRequest(qbxmlString, expectedEntityType);
        
        result.errors.push(...validationResult.errors);
        result.warnings.push(...validationResult.warnings);

        if (!validationResult.isValid) {
          result.success = false;
          return result;
        }
      }

      result.success = true;
      console.log('QBXML request validation completed successfully');

    } catch (error) {
      const qbError = this.errorHandler.classifyError(
        error instanceof Error ? error : new Error(String(error)),
        { entityType: expectedEntityType, operation: QBOperation.QUERY }
      );

      result.errors.push({
        field: 'request_processing',
        message: qbError.message,
        code: qbError.code,
        severity: qbError.severity === 'Critical' ? 'Critical' : 'Error'
      });

      result.success = false;
    } finally {
      result.metadata.processingTimeMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Batch process multiple QBXML responses
   */
  async processBatch<T extends QBEntity = QBEntity>(
    qbxmlResponses: Array<{
      content: string;
      entityType?: QBEntityType;
      requestId?: string;
    }>,
    options: QBXMLProcessingOptions & {
      continueOnError?: boolean;
      maxConcurrent?: number;
    } = {}
  ): Promise<{
    results: QBXMLProcessingResult<T>[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      warnings: number;
    };
  }> {
    console.log(`Processing batch of ${qbxmlResponses.length} QBXML responses`);

    const batchResult = await this.errorHandler.processBatch(
      qbxmlResponses,
      async (item, index) => {
        return this.processQBXMLResponse<T>(
          item.content,
          item.entityType,
          { ...options, validateSchema: options.validateSchema !== false }
        );
      },
      {
        continueOnError: options.continueOnError !== false,
        maxConcurrent: options.maxConcurrent || 3,
        context: {
          operation: QBOperation.QUERY,
          entityType: QBEntityType.CUSTOMER
        }
      }
    );

    const results = batchResult.results;
    const warningCount = results.reduce((count, result) => count + result.warnings.length, 0);

    return {
      results,
      summary: {
        total: qbxmlResponses.length,
        successful: batchResult.successCount,
        failed: batchResult.errorCount,
        warnings: warningCount
      }
    };
  }

  /**
   * Health check for processor components
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      validator: 'ok' | 'error';
      transformer: 'ok' | 'error';
      errorHandler: 'ok' | 'error';
    };
    details?: string[];
  }> {
    const details: string[] = [];
    const components = {
      validator: 'ok' as 'ok' | 'error',
      transformer: 'ok' as 'ok' | 'error',
      errorHandler: 'ok' as 'ok' | 'error'
    };

    try {
      // Test validator
      const testXml = `<?xml version="1.0" encoding="utf-8"?>
        <QBXML>
          <QBXMLMsgsRq onError="stopOnError">
            <CustomerQueryRq requestID="1">
              <MaxReturned>1</MaxReturned>
            </CustomerQueryRq>
          </QBXMLMsgsRq>
        </QBXML>`;
      
      this.validator.validateRequest(testXml, QBEntityType.CUSTOMER);
    } catch (error) {
      components.validator = 'error';
      details.push(`Validator error: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Test transformer
      const testResponseXml = `<?xml version="1.0" encoding="utf-8"?>
        <QBXML>
          <QBXMLMsgsRs>
            <CustomerQueryRs requestID="1" statusCode="0" statusSeverity="Info" statusMessage="Status OK">
              <CustomerRet>
                <ListID>123</ListID>
                <Name>Test Customer</Name>
                <FullName>Test Customer</FullName>
                <IsActive>true</IsActive>
              </CustomerRet>
            </CustomerQueryRs>
          </QBXMLMsgsRs>
        </QBXML>`;
      
      await this.transformer.transformQBXMLResponse(testResponseXml);
    } catch (error) {
      components.transformer = 'error';
      details.push(`Transformer error: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Test error handler
      await this.errorHandler.executeWithRetry(
        () => Promise.resolve('test'),
        {},
        { maxRetries: 0 }
      );
    } catch (error) {
      components.errorHandler = 'error';
      details.push(`Error handler error: ${error instanceof Error ? error.message : String(error)}`);
    }

    const errorCount = Object.values(components).filter(status => status === 'error').length;
    const status = errorCount === 0 ? 'healthy' : errorCount === 3 ? 'unhealthy' : 'degraded';

    return {
      status,
      components,
      ...(details.length > 0 && { details })
    };
  }

  /**
   * Get processing statistics
   */
  getStatistics(): {
    config: QBXMLProcessorConfig;
    version: string;
    features: string[];
  } {
    return {
      config: this.config,
      version: '2.0.0',
      features: [
        this.config.validationEnabled ? 'validation' : null,
        this.config.transformationEnabled ? 'transformation' : null,
        this.config.errorHandlingEnabled ? 'error-handling' : null,
        'batch-processing',
        'health-checks'
      ].filter(Boolean) as string[]
    };
  }

  /**
   * Internal processing method
   */
  private async processInternal<T extends QBEntity = QBEntity>(
    qbxmlString: string,
    expectedEntityType?: QBEntityType,
    options: QBXMLProcessingOptions = {}
  ): Promise<QBXMLProcessingResult<T>> {
    const startTime = Date.now();
    const result: QBXMLProcessingResult<T> = {
      success: false,
      data: [],
      errors: [],
      warnings: [],
      metadata: {
        requestId: `process-${Date.now()}`,
        entityType: expectedEntityType || QBEntityType.CUSTOMER,
        operation: QBOperation.QUERY,
        processedAt: new Date().toISOString(),
        processingTimeMs: 0,
        recordCount: 0
      }
    };

    try {
      // Step 1: Validation
      if (this.config.validationEnabled && options.validateSchema !== false) {
        console.log('Validating QBXML response...');
        const validationResult = this.validator.validateResponse(qbxmlString, expectedEntityType);
        
        result.errors.push(...validationResult.errors);
        result.warnings.push(...validationResult.warnings);

        if (!validationResult.isValid) {
          result.success = false;
          return result;
        }
      }

      // Step 2: Transformation
      if (this.config.transformationEnabled && options.transformData !== false) {
        console.log('Transforming QBXML response...');
        const transformResult = await this.transformer.transformQBXMLResponse<T>(qbxmlString, options);
        
        if (transformResult.success) {
          result.data = transformResult.data || [];
          result.metadata.recordCount = result.data.length;
          result.warnings.push(...transformResult.warnings);
        } else {
          result.errors.push(...transformResult.errors);
          result.success = false;
          return result;
        }
      }

      result.success = true;
      console.log(`QBXML processing completed successfully. Processed ${result.metadata.recordCount} records.`);

    } catch (error) {
      const qbError = this.errorHandler.classifyError(
        error instanceof Error ? error : new Error(String(error)),
        { entityType: expectedEntityType, operation: QBOperation.QUERY }
      );

      result.errors.push({
        field: 'processing',
        message: qbError.message,
        code: qbError.code,
        severity: qbError.severity === 'Critical' ? 'Critical' : 'Error'
      });

      result.success = false;
    } finally {
      result.metadata.processingTimeMs = Date.now() - startTime;
    }

    return result;
  }
}