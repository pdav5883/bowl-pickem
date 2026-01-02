#!/bin/bash

################
# This script deploys the AWS resources required for bowl-pickem using CloudFormation.
# The input to the script is the name of the JSON parameters file used to define
# parameter values in the CFN stack.
#
# When the CFN stack is deployed, the lambda functions are populated with placeholder
# code, so this scripts also calls the lambda deploy script to update code.
################

STACK_NAME="bowl-pickem"

if [ $# -eq 0 ]; then
    PARAMS_FILE="cfn-params-private.json"
    TEMPLATE_FILE="${STACK_NAME}-cfn.yaml"
    elif [ $# -eq 1 ]; then
    PARAMS_FILE="${1}"
    TEMPLATE_FILE="${STACK_NAME}-cfn.yaml"
else
    PARAMS_FILE="${1}"
    TEMPLATE_FILE="${2}"
fi

# Check if --no-lambdas flag is present
DEPLOY_LAMBDAS=true
for arg in "$@"; do
    if [ "$arg" == "--no-lambdas" ]; then
        DEPLOY_LAMBDAS=false
        # Remove --no-lambdas from arguments for further use
        set -- "${@/--no-lambdas/}"
        break
    fi
done


echo "Deploying $STACK_NAME cloudformation with params ${PARAMS_FILE} and template ${TEMPLATE_FILE}"

aws cloudformation deploy \
--template-file ${TEMPLATE_FILE} \
--stack-name $STACK_NAME \
--parameter-overrides file://${PARAMS_FILE} \
--capabilities CAPABILITY_NAMED_IAM \
# --no-execute-changeset

if [ "$DEPLOY_LAMBDAS" = true ]; then
    cd ../lambdas
    bash deploy_lambdas.sh
    cd ../infrastructure
fi
