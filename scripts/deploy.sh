#!/bin/bash

# QBXML Relay Service Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("dev" "staging" "prod")
DEFAULT_ENVIRONMENT="dev"
DEFAULT_REGION="us-west-1"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Target environment (dev|staging|prod) [default: dev]"
    echo "  -r, --region REGION      AWS region [default: us-west-1]"
    echo "  -b, --bootstrap          Bootstrap CDK in the target account/region"
    echo "  -g, --generate-qwc      Generate QWC files after deployment"
    echo "  -d, --diff              Show differences before deployment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev                       # Deploy to dev (tests run automatically)"
    echo "  $0 -e prod -r us-west-2 -g      # Deploy to prod in us-west-2 and generate QWC"
    echo "  $0 -b                           # Bootstrap CDK only"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        log_error "AWS CDK is not installed. Run: npm install -g aws-cdk"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

run_tests() {
    log_info "Running tests..."
    npm test
    log_info "Tests passed ✓"
}

build_project() {
    log_info "Building project..."
    npm run build
    log_info "Build completed ✓"
}

bootstrap_cdk() {
    local environment=$1
    local region=$2
    
    log_info "Bootstrapping CDK for environment: $environment, region: $region"
    cdk bootstrap --context environment=$environment aws://$(aws sts get-caller-identity --query Account --output text)/$region
    log_info "CDK bootstrap completed ✓"
}

show_diff() {
    local environment=$1
    
    log_info "Showing deployment differences for environment: $environment"
    cdk diff --context environment=$environment
}

deploy_stack() {
    local environment=$1
    
    log_info "Deploying QBXML Relay stack to environment: $environment"
    cdk deploy --context environment=$environment --require-approval never
    log_info "Deployment completed ✓"
}

generate_qwc_files() {
    local environment=$1
    
    log_info "Generating QWC configuration files..."
    
    # Get the API Gateway URL from CloudFormation outputs
    local stack_name="QbxmlRelayStack-$environment"
    local api_url=$(aws cloudformation describe-stacks \
        --stack-name $stack_name \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$api_url" ]; then
        # Remove trailing slash and add /qbwc
        api_url=$(echo $api_url | sed 's/\/$//g')/qbwc
        log_info "Found API endpoint: $api_url"
        
        # Generate QWC files with actual URL
        node scripts/generate-qwc.js
        
        # Update the generated file with the actual URL
        local qwc_file="assets/qwc-configs/qbxml-relay-$environment.qwc"
        if [ -f "$qwc_file" ]; then
            sed -i.bak "s|https://your-api-gateway-url.execute-api.us-west-1.amazonaws.com/$environment/qbwc|$api_url|g" "$qwc_file"
            log_info "Updated QWC file with actual API URL: $qwc_file"
        fi
    else
        log_warn "Could not retrieve API Gateway URL. Please update QWC files manually."
        node scripts/generate-qwc.js
    fi
    
    log_info "QWC files generated ✓"
}

# Main script
main() {
    local environment=$DEFAULT_ENVIRONMENT
    local region=$DEFAULT_REGION
    local bootstrap_only=false
    local generate_qwc_flag=false
    local show_diff_flag=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                environment="$2"
                shift 2
                ;;
            -r|--region)
                region="$2"
                shift 2
                ;;
            -b|--bootstrap)
                bootstrap_only=true
                shift
                ;;
            -g|--generate-qwc)
                generate_qwc_flag=true
                shift
                ;;
            -d|--diff)
                show_diff_flag=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${environment} " ]]; then
        log_error "Invalid environment: $environment. Must be one of: ${ENVIRONMENTS[*]}"
        exit 1
    fi
    
    # Set AWS region
    export AWS_DEFAULT_REGION=$region
    
    log_info "Starting deployment process..."
    log_info "Environment: $environment"
    log_info "Region: $region"
    
    check_prerequisites
    
    if [ "$bootstrap_only" = true ]; then
        bootstrap_cdk $environment $region
        exit 0
    fi
    
    # Always run tests before any deployment - deployment will fail if tests fail
    run_tests
    
    build_project
    
    if [ "$show_diff_flag" = true ]; then
        show_diff $environment
        read -p "Continue with deployment? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled."
            exit 0
        fi
    fi
    
    deploy_stack $environment
    
    if [ "$generate_qwc_flag" = true ]; then
        generate_qwc_files $environment
    fi
    
    log_info "🎉 Deployment process completed successfully!"
    log_info "Next steps:"
    log_info "1. Import the appropriate QWC file into QuickBooks Web Connector"
    log_info "2. Configure authentication credentials"
    log_info "3. Test the connection"
}

# Run main function with all arguments
main "$@"