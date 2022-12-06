import json
import boto3

s3 = boto3.client("s3")
obj_bucket = "bowl-pickem-public"
obj_key = "data/data.json"


def lambda_handler(event, context):
    """
    Can handle three types of queries:
        - scoreboard: also takes year param, returns the full scoreboard for that year
        - games: also takes year param, only returns the games to populate picks form
        - years: returns all the years for which a scoreboard exists

    For GET request, parameters are in event['queryStringParameters']
        - qtype: one of the options above
        - year (scoreboard/games type only): 0 is latest year

    Returns:
      data dict for selected year, or list of years
    """
    qtype = event["queryStringParameters"]["qtype"]

    print("Query type {}".format(qtype))

    if qtype not in ("scoreboard", "games", "years"):
        print("Error: {} is not a valid qtype".format(qtype))
        raise Exception("Invalid qtype {}".format(qtype))

    data_s3 = s3.get_object(Bucket=obj_bucket, Key=obj_key)
    data = json.loads(data_s3["Body"].read().decode("UTF-8"))

    if qtype == "scoreboard":
        year = event["queryStringParameters"]["year"]
        return handle_scoreboard(data, year)
    elif qtype == "games":
        year = event["queryStringParameters"]["year"]
        return handle_games(data, year)
    elif qtype == "years":
        return handle_years(data)


def handle_scoreboard(data, year):
    """
    Return the full data dict for year
    """
    if year in data:
        yeardata =  data[year]
    elif year == "0":
        max_year = str(max([int(yr) for yr in data.keys()]))
        yeardata = data[max_year]
        year = max_year
    else:
        print("ERROR: year {} is not contained in scoreboard dict".format(year))
        raise Exception("Invalid year {}".format(year))

    # filter based on data.json flags for year
    if not yeardata["show_results"]:
        for game in yeardata["games"]:
            game["result"] = None
            game["score"] = []
    if not yeardata["show_picks"]:
        for player in yeardata["players"]:
            player["picks"] = [None] * len(player["picks"])

    return {"year": str(year), "data": yeardata}


def handle_games(data, year):
    """
    Return games only without picks
    """
    if year in data:
        yeardata = data[year]["games"]
    elif year == "0":
        max_year = str(max([int(yr) for yr in data.keys()]))
        yeardata = data[max_year]["games"]
        year = max_year
    else:
        print("ERROR: year {} is not contained in scoreboard dict".format(year))
        raise Exception("Invalid year {}".format(year))

    return {"year": str(year), "data": yeardata}


def handle_years(data):
    """
    Return list of years in data.json
    """
    return list(data.keys())
