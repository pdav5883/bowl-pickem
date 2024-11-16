import json
import boto3

ssm = boto3.client("ssm")
param_name = SUB_SsmAdminSecretId

def lambda_handler(event, context):
    auth_attempt = event.get("headers", {}).get("authorization", "")
    
    auth_truth = ssm.get_parameter(Name=param_name)["Parameter"]["Value"]
    
    if auth_attempt == auth_truth:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}
