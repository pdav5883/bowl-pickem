import json
import boto3

s3 = boto3.client('s3')
obj_bucket = "bowl-pickem-private"

def lambda_handler(event, context):
    """
    Accepts POST request

    Body contains:
        etype: results OR game
        year
        gid (optional)
        data

        If etype = results:
            data = [{"score": [..,..], "result": 0/1},...] in same order as bowls 

        If etype = game
            data = {"show_results":, "show_picks":, "lock_picks":, "players": {"oldname": "new_name",...}}
    """
    body = json.loads(event["body"])
    etype = body["etype"]
    year = body["year"]
    
    if etype == "results":
        new_results = body["data"]
        return update_results(year, new_results)
    
    elif etype == "game":
        gid = body["gid"]
        new_game_data = body["data"]
        return update_game(year, gid, new_game_data)
    

def update_results(year, new_results):
    """
    Updates the {year}/results.json file
    """
    obj_key = year + "/results.json"
    data_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
    
    old_data = json.loads(data_s3["Body"].read().decode("utf-8"))

    # validation checks
    try:
        assert year == old_data["year"], "New year must match Old year"
        assert len(new_results) == len(old_data["bowls"]), "New length must match Old length"

    except AssertionError as e:
        print("Error, validation failed")
        print(e)
        
        return {"statusCode": 400,
                "body": str(e)}

    new_data = {"year": year, "bowls": []}

    for old_bowl, new_result in zip(old_data["bowls"], new_results):
        new_bowl = dict(old_bowl)
        new_bowl["score"] = new_result["score"]
        new_bowl["result"] = new_result["result"]
        new_data["bowls"].append(new_bowl)

    print(f"Changing {obj_key} FROM:")
    print(old_data)

    print(f"Changing {obj_key} TO:")
    print(new_data)

    # update results.json file
    response = s3.put_object(Body=bytes(json.dumps(new_data, indent=2).encode('UTF-8')), Bucket=obj_bucket, Key=obj_key)

    return {"statusCode": 200,
            "body": "Successful update"}


def update_game(year, gid, new_game_data):
    """
    Updates the {year}/{gid}.json file with new game data
    new_game_data = {"show_results": bool,
                     "show_picks": bool,
                     "lock_picks": bool,
                     "players": {old_name: new_name,...}}
    """
    obj_key = year + "/" + gid + ".json"
    data_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
    
    game_data = json.loads(data_s3["Body"].read().decode("utf-8"))

    print(f"Updating {obj_key} with data:")
    print(new_game_data)

    # validation checks
    try:
        assert type(new_game_data["show_results"]) is bool, "Flag must be bool"
        assert type(new_game_data["show_picks"]) is bool, "Flag must be bool"
        assert type(new_game_data["lock_picks"]) is bool, "Flag must be bool"
        assert len(game_data["players"]) == len(new_game_data["players"]), "Number of players must match"
    
    except AssertionError as e:
        print("Error, validation failed")
        print(e)
        
        return {"statusCode": 400,
                "body": str(e)}
    
    game_data["show_results"] = new_game_data["show_results"]
    game_data["show_picks"] = new_game_data["show_picks"]
    game_data["lock_picks"] = new_game_data["lock_picks"]

    for player in game_data["players"]:
        old_name = player["name"]
        new_name = new_game_data["players"][old_name]
        player["name"] = new_name

    response = s3.put_object(Body=bytes(json.dumps(game_data, indent=2).encode('UTF-8')), Bucket=obj_bucket, Key=obj_key)

    return {"statusCode": 200,
            "body": "Successful update"}

