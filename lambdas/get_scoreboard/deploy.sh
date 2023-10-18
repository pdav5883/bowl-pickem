rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BowlsGetScoreboard --zip-file fileb:///home/peter/Projects/bowl-pickem/lambdas/get_scoreboard/lambda.zip
