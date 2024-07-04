echo "Deploying bowl-pickem cloudformation with params from ${1}"

aws cloudformation deploy \
  --template-file ./bowl-pickem-cfn.yaml \
  --stack-name bowl-pickem \
  --parameter-overrides file://${1} \
  --capabilities CAPABILITY_NAMED_IAM \
  # --no-execute-changeset
