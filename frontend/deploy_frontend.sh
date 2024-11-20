#############
# This script deploys fronten resources after building via webpack and grabbing infrastructure resource
# information from the running CloudFormation stack. It then uploads the frontend build to S3 and syncs
# the CloudFront distro.
############

# Set initial value
value=0

grab() {
    type=$1
    key=$2

    value=$(aws cloudformation describe-stacks --stack-name bowl-pickem \
        --query "Stacks[0].${type}s[?${type}Key=='${key}'].${type}Value | [0]" \
        | tr -d '"')

    echo "Grabbed CloudFormation ${type} ${key}=${value}"
}

grab Parameter PublicBucketName
bucket_name=$value

grab Output CloudFrontDistroId
distro_id=$value

# Build webpack
echo "Building frontend files with webpack..."
rm -rf dist
npm run build

# Sync to AWS
echo "Uploading frontend files to AWS..."
aws s3 sync ./dist "s3://${bucket_name}" --cache-control="max-age=21600" \
    --exclude="*" \
    --include="*.html" \
    --include="*.css" \
    --include="*.js" \
    --include="*.ico" \
    --include="*.woff2"

aws cloudfront create-invalidation --distribution-id "${distro_id}" --paths "/*"
