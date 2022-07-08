aws s3 sync . s3://bowl-pickem-public --exclude='*' \
  --include='*.html' \
  --include='scripts/*.js' \
  --include='styles*.css' \
  --include='*.zip' \
  --include='images*.ico' \
