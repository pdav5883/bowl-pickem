#############
# This script updates the code used for a lambda function defined and deployed via cloudformation template.
# When cloudformation deploys the lambda, it is created/updated with inline non-functional code since uploading from
# the S3 bucket also created in the CFN template is not possible.
#
# Any parameter references (e.g. bucket names) made in the lambda code are also substituted prior to upload. These substitutions
# are denoted by SUB_CFNResourceName in lambda_function.py
#
# This scripts grabs parameter values from the actual cloudformation stack, which are themselves defined in the cfn-params.json
# file used to deploy the stack.
#
# The scripts takes one argument: the CFN parameter name used for the lambda function being updated
############

lambda_cfn_ref=$1

# make substitutions in tmp py file that gets zipped and uploaded
mkdir _tmp
cp lambda_function.py _tmp
cd _tmp

# find SUB_ references in lambda_function.py, replace them with parameter value
subs=$(grep -oP '(?<=SUB_).*' lambda_function.py)
for sub in $subs; do
  rep=$(aws cloudformation describe-stacks --stack-name bowl-pickem --query "Stacks[0].Parameters[?ParameterKey=='${sub}'].ParameterValue | [0]")
  echo "Replacing $sub with $rep in lambda_function.py"
  sed -i -e "s/SUB_$sub/$rep/g" lambda_function.py
done

# find function name from stack
lambda_name=$(aws cloudformation describe-stacks --stack-name bowl-pickem --query "Stacks[0].Parameters[?ParameterKey=='${lambda_cfn_ref}'].ParameterValue | [0]" | tr -d '"')

# update lambda code via zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name ${lambda_name} --zip-file fileb://lambda.zip

# cleanup
cd ..
rm -rf _tmp
