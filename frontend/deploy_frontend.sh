#############
# This script deploys fronten resources after building via webpack and grabbing infrastructure resource
# information from the running CloudFormation stack. It then uploads the frontend build to S3 and syncs
# the CloudFront distro.
############

STACK_NAME="bowl-pickem"

# Grab params and outputs from Cloudformation stack
declare -A CF_PARAMS
while IFS= read -r line; do
    key=$(echo "$line" | awk '{print $1}')
    value=$(echo "$line" | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Parameters[]' --output text | awk '{print $1, $2}')

while IFS= read -r line; do
    key=$(echo "$line" | awk '{print $1}')
    value=$(echo "$line" | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[]' --output text | awk '{print $1, $2}')

# Build webpack
echo "Building frontend files with webpack..."
rm -rf dist
npm run build

# Sync to AWS
echo "Uploading frontend files to AWS..."
aws s3 sync ./dist "s3://${CF_PARAMS[PublicBucketName]}" --cache-control="max-age=21600" \
    --exclude="*" \
    --include="*.html" \
    --include="*.css" \
    --include="*.js" \
    --include="*.ico" \
    --include="*.woff2"

aws cloudfront create-invalidation --distribution-id "${CF_PARAMS[CloudFrontDistroId]}" --paths "/*" > /dev/null 2>&1
