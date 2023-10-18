import json
import boto3

s3 = boto3.client('s3')
obj_bucket = "bowl-pickem-private"
obj_key = "data/data.json"

def lambda_handler(event, context):
    # get new picks from event
    res = json.loads(event["body"])
    year = res["year"]
    new_picks = res["data"]
    print("Year: " + year + "; Adding: " + json.dumps(new_picks))
    
    # convert string pick indices to int
    new_picks["picks"] = [int(p) for p in new_picks["picks"]]

    if "categories" in new_picks:
        new_picks["categories"] = [int(c) for c in new_picks["categories"]]
    
    # retrieve existing data file from s3
    data_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
    data = json.loads(data_s3["Body"].read().decode("utf-8"))
    
    # print(data)
    
    # append new picks
    if "categories" in new_picks:
        data[year]["players"].append({"name": new_picks["name"], "picks": new_picks["picks"], "categories": new_picks["categories"]})
    else:
        data[year]["players"].append({"name": new_picks["name"], "picks": new_picks["picks"]})
    
    # upload new data to s3
    response = s3.put_object(Body=bytes(json.dumps(data, indent=2).encode('UTF-8')), Bucket=obj_bucket, Key=obj_key)
    # print(response)
