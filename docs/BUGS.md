# Bug Tracker

This document tracks known issues, technical debt, and improvements needed for the QBXML Relay Service.

## Current Issues

### 🐛 High Priority

Currently no high priority bugs.

### 🔧 Medium Priority


#### [ISSUE-002] Environment Consolidation Needed  
- **Description**: Currently have dev/staging/prod environments but may only need staging/prod
- **Impact**: Unnecessary complexity and resource costs for development environment
- **Severity**: Low
- **Status**: Open
- **Created**: 2025-08-20
- **Notes**:
  - Development work can be done locally with unit tests
  - Staging environment sufficient for integration testing
  - Production for live deployment
  - Consider removing dev environment configuration
  - Update deployment scripts and documentation accordingly

### 🔍 Low Priority

Currently no low priority issues.

## Resolved Issues

### ✅ Fixed

#### [RESOLVED-001] DynamoDB Point-in-Time Recovery Overkill
- **Description**: DynamoDB tables were configured with Point-in-Time Recovery (PITR) which was overkill for session management data
- **Resolution**: Disabled PITR for all environments in CDK configuration (`pointInTimeRecovery: false`)
- **Impact**: Reduced AWS costs by ~$0.70-$15.00/month per environment for unnecessary backup of ephemeral data
- **Resolved**: 2025-08-20

#### [RESOLVED-002] TypeScript Compilation Errors
- **Description**: API Gateway VTL template syntax caused TypeScript compilation failures
- **Resolution**: Fixed template string formatting in `lib/constructs/qbwc-api.ts`
- **Resolved**: 2025-08-20

#### [RESOLVED-003] DynamoDB Duplicate Property Error
- **Description**: Duplicate `ExpressionAttributeValues` properties in session manager
- **Resolution**: Merged duplicate properties in `lambda/qbwc-handler/session-manager.ts`
- **Resolved**: 2025-08-20

#### [RESOLVED-004] CDK Version Incompatibility
- **Description**: CDK CLI version mismatch with library version
- **Resolution**: Updated CDK library version to match CLI in `package.json`
- **Resolved**: 2025-08-20

#### [RESOLVED-005] API Gateway Circular Dependency
- **Description**: Resource policy created circular dependency in CloudFormation
- **Resolution**: Removed problematic resource policy from API Gateway configuration
- **Resolved**: 2025-08-20

#### [RESOLVED-006] Invalid Response Parameter Mapping
- **Description**: API Gateway method response parameter mapping for Content-Type was invalid
- **Resolution**: Removed invalid response parameter mappings
- **Resolved**: 2025-08-20

## Issue Guidelines

### Reporting New Issues
1. Use descriptive issue ID: `[ISSUE-XXX]`
2. Include severity: High/Medium/Low
3. Provide clear description and impact
4. Add creation date
5. Include relevant notes or context

### Issue Severity Levels
- **High**: Production breaking, security issues, data loss
- **Medium**: Performance degradation, unnecessary costs, technical debt
- **Low**: Minor improvements, nice-to-have features

### Status Types
- **Open**: Issue needs investigation or resolution
- **In Progress**: Actively being worked on
- **Blocked**: Waiting on external dependency
- **Resolved**: Issue has been fixed

## Next Review
- Review open issues during Phase 2 planning
- Consider environment consolidation during next deployment cycle
- Evaluate DynamoDB configuration during cost optimization review