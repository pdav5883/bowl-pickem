aws s3 sync . s3://bowl-pickem-public --exclude="*" --include="*.html" --include="*.css" --include="*.js" --exclude="venv/*"
aws cloudfront create-invalidation --distribution-id E25KXPCJUCQE6E --paths "/*"
