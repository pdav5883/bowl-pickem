#!/bin/bash

STACK_NAME="bowl-pickem"

# Get stack parameters
aws cloudformation describe-stacks --stack-name "${STACK_NAME}" \
--query 'Stacks[0].Parameters[*].[ParameterKey,ParameterValue]' \
--output text | \
while read -r key value; do
    echo "SUB_${key}=${value}"
done

# Get stack outputs
aws cloudformation describe-stacks --stack-name "${STACK_NAME}" \
--query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
--output text | \
while read -r key value; do
    echo "SUB_${key}=${value}"
done
