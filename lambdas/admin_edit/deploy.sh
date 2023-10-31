rm lambda.zip
zip lambda.zip lambda_function.py
aws lambda update-function-code --function-name BowlsAdminEdit --zip-file fileb:///home/peter/Projects/bowl-pickem/lambdas/admin_edit/lambda.zip
