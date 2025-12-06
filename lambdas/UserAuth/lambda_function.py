import json
import boto3
from botocore.exceptions import ClientError

blr_authorizer = SUB_BLRLambdaUserAuthArn # type: ignore
primary_route = SUB_PrimaryRouteName # type: ignore
admin_route = SUB_AdminRouteName # type: ignore

lambda_client = boto3.client('lambda')


def lambda_handler(event, context):
    access_token = event['headers'].get('authorization', '')

    if not access_token:
        print("There is no access token in authorization header")
        return {"isAuthorized": False}

    user_id = event.get('queryStringParameters', {}).get('pid', '').replace(' ', '__').lower()

    if event["rawPath"] == "/" + primary_route:
        auth_type = "specificUser"
    elif event["rawPath"] == "/" + admin_route:
        auth_type = "adminUser"
    else:
        print(f"Invalid route {event['rawPath']}")
        return {"isAuthorized": False}

    lambda_event = {"authType": auth_type, "accessToken": access_token, "userID": user_id}

    lambda_response = lambda_client.invoke(FunctionName=blr_authorizer,
                                            InvocationType='RequestResponse',
                                            Payload=json.dumps(lambda_event))
    
    if json.loads(lambda_response['Payload'].read())["isAuthorized"]:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}