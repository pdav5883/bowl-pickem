import os
import json
import boto3

s3 = boto3.client("s3")
obj_bucket = "bowl-pickem-private"


def lambda_handler(event, context):
    """
    Can handle three types of queries:
        - scoreboard: takes year and game id params, returns the full scoreboard for that year
        - bowls: takes year param, returns bowls in that year
        - games: takes year param, returns list of game structs  (not bowls)
        - years: returns all the years for which a scoreboard exists

    For GET request, parameters are in event['queryStringParameters']
        - qtype: one of the options above
        - year: 0 is latest year
        - gid: game id

    Returns:
      data dict for selected year, or list of years
    """
    qtype = event["queryStringParameters"]["qtype"]

    print("Query type {}".format(qtype))

    if qtype not in ("scoreboard", "bowls", "games", "years"):
        msg = f"Error: {qtype} is not a valid qtype"
        print(msg)
        return {"statusCode": 400,
                "body": msg}

    if qtype == "scoreboard":
        year = event["queryStringParameters"]["year"]
        gid = event["queryStringParameters"]["gid"]
        return handle_scoreboard(year, gid)
    elif qtype == "bowls":
        year = event["queryStringParameters"]["year"]
        return handle_bowls(year)
    elif qtype == "games":
        year = event["queryStringParameters"]["year"]
        return handle_games(year)
    elif qtype == "years":
        return handle_years()


def handle_scoreboard(year, gid):
    """
    Return the full data dict for year
    """

    game_key = year + "/" + gid + ".json"
    game_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)

    # if not game_s3:
    #   return {"statusCode": 400, "body": f"Year/Game {year}/{gid} not found"}
    
    game = json.loads(game_s3["Body"].read().decode("UTF-8"))
    
    bowls_key = year + "/results.json"
    bowls_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
    bowls = json.loads(bowl_s3["Body"].read().decode("UTF-8"))

    game["bowls"] = bowls["bowls"]

    # filter based on game flags
    if not game["show_results"]:
        for bowl in game["bowls"]:
            bowl["result"] = None
            bowl["score"] = []
    if not game["show_picks"]:
        for player in game["players"]:
            player["picks"] = [None] * len(player["picks"])

    return {"year": str(year), "data": game}


#def handle_advanced_scoreboard(data, year):
#    """
#    Return the data dict for year, but only with players who have "categories" field
#    """
#    return_dict = handle_scoreboard(data, year)
#
#    adv_players = []
#
#    for player in return_dict["data"]["players"]:
#        if "categories" in player:
#            adv_players.append(player)
#
#    return_dict["data"]["players"] = adv_players
#    return return_dict


def handle_bowls(year):
    """
    Return bowls only without picks
    """
    obj_key = year + "/results.json"

    bowls_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)

    # if not bowls_s3:
    #   return {"statusCode": 400, "body": f"Year {year} not found"}
    bowls = json.loads(bowls_s3["Body"].read().decode("UTF-8"))

    return bowls["bowls"]


def handle_games(year):
    """
    Return all games in a year with format:
        {gid: {"players": [list of players], "locked": true/false}...}
    """
    year_keys = s3.list_objects(Bucket=obj_bucket, Prefix=str(year) + "/", Delimiter="/").get("Contents")
    fnames = [yk.get("Key").split("/")[-1] for yk in year_keys]
    gids = [os.path.splitext(fn)[0] for fn in fnames if fn and fn != "results.json"]

    res = {}

    for gid in gids:
        obj_key = year + "/" + gid + ".json"
        game_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
        game = json.loads(game_s3["Body"].read().decode("UTF-8"))
        players = [p["name"] for p in game["players"]]
        gtype = game["type"]
        locked = game["lock_picks"]

        res[gid] = {"players": players, "type": gtype, "locked": locked}

    return res


def handle_years():
    """
    Return list of years bucket
    """
    s3_subdirs = s3.list_objects(Bucket=obj_bucket, Delimiter="/").get("CommonPrefixes")
    years = [subdir.get("Prefix")[:-1] for subdir in s3_subdirs if subdir.get("Prefix")[:-1].isnumeric()]
    years.sort()

    return years
