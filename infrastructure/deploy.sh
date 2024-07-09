################
# This script deploys the AWS resources required for bowl-pickem using CloudFormation.
# The input to the script is the name of the JSON parameters file used to define
# parameter values in the CFN stack.
#
# When the CFN stack is deployed, the lambda functions are populated with placeholder
# code, so this scripts also calls the deploy scripts for each lambda to upload code.
################

echo "Deploying bowl-pickem cloudformation with params from ${1}"

aws cloudformation deploy \
  --template-file ./bowl-pickem-cfn.yaml \
  --stack-name bowl-pickem \
  --parameter-overrides file://${1} \
  --capabilities CAPABILITY_NAMED_IAM \
  # --no-execute-changeset

cd ../lambdas

for d in */
do
  echo "Deploying lambda update from ${d}"
  cd $d
  sh deploy.sh
  cd ..
done

