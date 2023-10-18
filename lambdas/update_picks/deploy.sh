rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BowlsUpdatePicks --zip-file fileb:///home/peter/Projects/bowl-pickem/lambdas/update_picks/lambda.zip
