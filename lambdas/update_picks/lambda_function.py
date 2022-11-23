import json
import boto3

s3 = boto3.client('s3')
obj_bucket = "bowl-pickem-public"
obj_key = "data/data.json"

def lambda_handler(event, context):
    # get new picks from event
    new_picks = json.loads(event["body"])
    print("Adding: " + json.dumps(new_picks))
    
    # convert string pick indices to int
    new_picks["picks"] = [int(p) for p in new_picks["picks"]]
    
    # retrieve existing data file from s3
    data_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
    data = json.loads(data_s3["Body"].read().decode("utf-8"))
    
    # print(data)
    
    # append new picks
    data["players"].append({"name": new_picks["name"], "picks": new_picks["picks"]})
    
    # upload new data to s3
    response = s3.put_object(Body=bytes(json.dumps(data, indent=2).encode('UTF-8')), Bucket=obj_bucket, Key=obj_key)
    # print(response)
