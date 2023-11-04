import json
import boto3
from botocore.exceptions import ClientError


s3 = boto3.client('s3')
obj_bucket = "bowl-pickem-private"

def lambda_handler(event, context):
    # get new picks from event
    res = json.loads(event["body"])
    year = res["year"]
    gid = res["gid"]
    new_picks = res["data"]
    print("Year: " + year + "; Game ID: " + gid + "; Adding: " + json.dumps(new_picks))
    
    # convert string pick indices to int
    new_picks["picks"] = [int(p) for p in new_picks["picks"]]

    if "categories" in new_picks:
        new_picks["categories"] = [int(c) for c in new_picks["categories"]]
    
    # retrieve existing data file from s3
    obj_key = year + "/" + gid + ".json"
    
    try:
        data_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
    
    except ClientError as e:
        print(e)
        return {"statusCode": 400,
                "body": f"{gid} does not exist for {year}"}
    
    data = json.loads(data_s3["Body"].read().decode("utf-8"))

    if data["lock_picks"]:
        return {"statusCode": 403,
                "body": "Picks are locked for this game"}

    # TODO: error checking
    # name is already used
    # incorrect number of picks
    # incorrect number of categories
    # incorrect number of each category
    # incorrect types
    
    # append new picks
    if "categories" in new_picks:
        data["players"].append({"name": new_picks["name"], "picks": new_picks["picks"], "categories": new_picks["categories"]})
    else:
        data["players"].append({"name": new_picks["name"], "picks": new_picks["picks"]})
    
    # upload new data to s3
    response = s3.put_object(Body=bytes(json.dumps(data, indent=2).encode('UTF-8')), Bucket=obj_bucket, Key=obj_key)

