# Bowl Pickem
This repo contains the client side code and python lambda code for a College Football bowl picking web application. Currently the site is set up as a static site hosted in AWS S3, with a JSON data file containing picks and results. Whenever new picks are made a lambda call updates and republishes the data file. This eventually should turn into an actual database. 

## Notes
Test with `python -m http.server`

S3 bucket: `bowl-pickem-public`

Static site endpoint: http://bowl-pickem-public.s3-website-us-east-1.amazonaws.com/

To update website code run `bash sync_code.sh` within directory

To update lambda code run `zip pickem_lambda.zip lambda_function.py`, then sync code as above, then within lambda function select "upload from s3" 

To update data.json (TODO: need to sync in other direction first) run `bash sync_data.sh` within directory

## TODO
- Fix CORS policy in API
- Sync s3 data.json to local, edit, then sync back

## Future Work
- Add year option for data file and picks/scoreboard
- Advanced picking style
- Move data to DB
