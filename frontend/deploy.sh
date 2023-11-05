aws s3 sync . s3://bowl-pickem-public --cache-control="max-age=21600" --exclude="*" --include="*.html" --include="*.css" --include="*.js"
aws cloudfront create-invalidation --distribution-id E25KXPCJUCQE6E --paths "/*"
