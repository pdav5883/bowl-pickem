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

    # error checking
    try:
        # name is already used
        names = [player["name"] for player in data["players"]]
        assert new_picks["name"] not in names, f"{new_picks['name']} already used"
    
        # incorrect number of picks
        results_s3 = s3.get_object(Bucket=obj_bucket, Key=f"{year}/results.json")
        results = json.loads(results_s3["Body"].read().decode("utf-8"))
        numgames = len(results["bowls"])
        assert len(new_picks["picks"]) == numgames, "Incorrect number of picks submitted"

        # incorrect number of categories
        if "categories" in new_picks:
            assert len(new_picks["categories"]) == numgames, "Incorrect number of categories submitted"

        # incorrect number of each category
        if "categories" in new_picks:
            catRemaining = 6 * [(numgames - 3) // 6]
            for i in range((numgames - 3) % 6):
                catRemaining[i] += 1

            # semis/final are all cat 3
            catRemaining[2] += 3

            for cat in new_picks["categories"]:
                catRemaining[int(cat) - 1] -= 1

            assert all(c == 0 for c in catRemaining), "Incorrect mix of categories submitted"

        # incorrect types
        for pick in new_picks["picks"]:
            assert pick in (0, 1, "0", "1", False, True), "Pick has incorrect format"

        if "categories" in new_picks:
            for cat in new_picks["categories"]:
                assert cat in (1, 2, 3, 4, 5, 6, "1", "2", "3", "4", "5", "6"), "Category has incorrect format"

    
    except AssertionError as msg:
        print(msg)
        return {"statusCode": 400,
                "body": msg}

    # append new picks
    if "categories" in new_picks:
        data["players"].append({"name": new_picks["name"], "picks": new_picks["picks"], "categories": new_picks["categories"]})
    else:
        data["players"].append({"name": new_picks["name"], "picks": new_picks["picks"]})
    
    # upload new data to s3
    response = s3.put_object(Body=bytes(json.dumps(data, indent=2).encode('UTF-8')), Bucket=obj_bucket, Key=obj_key)

