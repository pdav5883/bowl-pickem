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

echo "Deploying $STACK_NAME cloudformation with params from ${1}"

aws cloudformation deploy \
  --template-file ./bowl-pickem-cfn.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides file://${1} \
  --capabilities CAPABILITY_NAMED_IAM \
  # --no-execute-changeset

cd ../lambdas
bash deploy_lambdas.sh

cd ../infrastructure

