"""Lambda function for user authentication and authorization within bowl-pickem."""

import json
import boto3

blr_authorizer = SUB_BLRLambdaUserAuthArn  # type: ignore
primary_route = SUB_PrimaryRouteName  # type: ignore
admin_route = SUB_AdminRouteName  # type: ignore

lambda_client = boto3.client("lambda")


def lambda_handler(event, context):
    """
    Handles bowl-pickem user authentication by passing to BLR user auth lambda.

    Args:
        event: The Lambda event containing request headers and path
        context: The Lambda context object

    Returns:
        dict: Authorization result with 'isAuthorized' boolean
    """
    access_token = event["headers"].get("authorization", "")

    if not access_token:
        print("There is no access token in authorization header")
        return {"isAuthorized": False}

    user_id = (
        event.get("queryStringParameters", {}).get("pid", "").replace(" ", "__").lower()
    )

    if event["rawPath"] == "/" + admin_route:
        auth_type = "adminUser"
    else:
        print(f"Invalid route {event['rawPath']}")
        return {"isAuthorized": False}

    lambda_event = {
        "authType": auth_type,
        "accessToken": access_token,
        "userID": user_id,
    }

    lambda_response = lambda_client.invoke(
        FunctionName=blr_authorizer,
        InvocationType="RequestResponse",
        Payload=json.dumps(lambda_event),
    )

    if json.loads(lambda_response["Payload"].read())["isAuthorized"]:
        return {"isAuthorized": True}
    else:
        return {"isAuthorized": False}
