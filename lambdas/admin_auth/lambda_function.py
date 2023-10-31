import json
import boto3

ssm = boto3.client("ssm")

def lambda_handler(event, context):
    auth_attempt = event.get("headers", {}).get("authorization", "")
    
    auth_truth = ssm.get_parameter(Name="bowl-admin-secret")["Parameter"]["Value"]
    
    if auth_attempt == auth_truth:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}
