aws s3 sync . s3://bowl-pickem-public --exclude='*' \
  --include='data/data.json'
