import json
import os
import itertools
import boto3
import numpy as np

s3 = boto3.client("s3")
obj_bucket = SUB_PrivateBucketName # type: ignore

# TODO: don't hardcode
# next/prev games for 12 team playoffs. first entry is game, second index is upper/lower slot
NEXT_GAMES = [[4, 1], [5, 1], [6, 1], [7, 1],
              [8, 0], [8, 1], [9, 0], [9, 1],
              [10, 0], [10, 1],
              [None, None]]
PREV_GAMES = [[None, None], [None, None], [None, None], [None, None],
              [None, 0], [None, 1], [None, 2], [None, 3],
              [4, 5], [6, 7],
              [8, 9]]
PLAYOFF_POINTS = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5]

# next/prev games for 8 team playoff
# NEXT_GAMES = [[3, 0], [3, 1], [4, 0], [4, 1],
#               [5, 0], [5, 1],
#               [6, 0], [6, 1],
#               [None, None]]
# PREV_GAMES = [[None, None], [None, None], [None, None], [None, None],
#               [0, 1], [2, 3],
#               [4, 5]]
# PLAYOFF_POINTS = [2, 2, 2, 2, 3, 3, 4]


# next/prev games for 4 team playoff
# NEXT_GAMES = [[2, 0], [2, 1],
#               [None, None]]
# PREV_GAMES = [[None, None], [None, None],
#               [0, 1]]
# PLAYOFF_POINTS = [2, 2, 3]


def lambda_handler(event, context):
    """
    Updates the margin of victory for a bowl game.
    
    Triggered by AdminEdit with event:

    event = {"year": yr}

    TODO: bonus points not accounted for
    """
    year = event["year"]

    print(f"Updating margins for year {year}")

    results_s3 = s3.get_object(Bucket=obj_bucket, Key=year + "/results.json")
    results = json.loads(results_s3["Body"].read().decode("UTF-8"))

    # results and picks are 1 or -1, nan if game not played for results
    results_array = np.array([r["result"] for r in results["bowls"]], dtype=float)
    completed_games = ~np.isnan(results_array)

    gid_keys = s3.list_objects_v2(Bucket=obj_bucket, Prefix=year + "/").get("Contents", [])
    fnames = [g.get("Key").split("/")[-1] for g in gid_keys]
    gids = [os.path.splitext(fn)[0] for fn in fnames if fn and fn != "results.json"]

    for gid in gids:
        game_s3 = s3.get_object(Bucket=obj_bucket, Key=year + "/" + gid + ".json")
        game = json.loads(game_s3["Body"].read().decode("UTF-8"))

        # TODO: not implemented yet
        if game["type"] == "advanced":
            print(f"Skipping advanced game {gid}")
            continue
        
        print(f"Updating margins for game {gid}")

        picks_matrix = np.array([player["picks"] for player in game["players"]], dtype=float)

        best_finish, max_margin = calc_best_finish(picks_matrix, results_array, completed_games)

        for i in range(len(game["players"])):
            game["players"][i]["best_finish"] = best_finish[i]
            game["players"][i]["max_margin"] = max_margin[i]

        s3.put_object(Bucket=obj_bucket, Key=year + "/" + gid + ".json", Body=bytes(json.dumps(game, indent=2).encode('UTF-8')))

    return {"statusCode": 200,
            "body": "Successful margin update"}


def calc_best_finish(picks_matrix, results_array, completed_games):
    NUM_PLAYOFF = len(NEXT_GAMES)


    playoff_picks_matrix = picks_matrix[:, -NUM_PLAYOFF:]
    regular_picks_matrix = picks_matrix[:, :-NUM_PLAYOFF]
    
    # N = number of players, K = number of playoff scenarios
    # N x N
    regular_max_scores = calc_non_playoff_max_scores(picks_matrix[:, :-NUM_PLAYOFF],
                                                     results_array[:-NUM_PLAYOFF],
                                                     completed_games[:-NUM_PLAYOFF])
    # K x N 
    playoff_scenarios = calc_all_playoff_scenarios(picks_matrix[:, -NUM_PLAYOFF:],
                                                    results_array[-NUM_PLAYOFF:],
                                                    completed_games[-NUM_PLAYOFF:])

    # N x N x K
    # (i, j, k) is the score for player j if all player i remaining picks are correct, and playoff scenario k occurs
    all_scores = regular_max_scores[:, :, np.newaxis] + playoff_scenarios.T[np.newaxis, :, :]

    x = np.diagonal(all_scores, axis1=0, axis2=1)
    y = x.T[:, np.newaxis, :]
    # if margin value is > 0, that means player i is ahead of player j
    all_margins = np.diagonal(all_scores, axis1=0, axis2=1).T[:, np.newaxis, :] - all_scores
    
    # set diagonals to inf so that we can ignore diagonalsin min/max margin calc
    all_margins += np.diag(np.inf * np.ones(picks_matrix.shape[0]))[:, :, np.newaxis]

    # take the min across j players to see which other player is best for each scenario k
    min_all_margins = np.min(all_margins, axis=1)

    # take max across scenarios to see the best each player can do
    indmax_margins = np.argmax(min_all_margins, axis=1)
    max_margins = [int(min_all_margins[i, indmax_margins[i]]) for i in range(picks_matrix.shape[0])]

    # if a player has positive margin, they can finish in 1st, otherwise go and look
    #  to see what best finish is. This only goes and looks at scenario where they are closest to 1st
    #  so it will miss edge cases where they could finish in higher position with worse margin
    best_finish = []

    for i in range(picks_matrix.shape[0]):
        if max_margins[i] >= 0:
            best_finish.append(1)
        else:
            scenario_margins = all_margins[i, :, indmax_margins[i]]
            best_finish.append(int(np.sum(scenario_margins < 0)) + 1)

    return best_finish, max_margins

    
    
def calc_non_playoff_max_scores(picks_matrix, results_array, completed_games):
    """
    Input arrays are non playoff games
    Return a N, N matrix where N is number of players.

    Row i is the scores for all players if player i gets all remaining picks correct.
    """
    # score is computed for each each with XNOR between pick and result
    # equiv to pick * result + (1 - pick) * (1 - result)
    current_scores = np.dot(picks_matrix[:, completed_games], results_array[completed_games])
    current_scores += np.dot(1 - picks_matrix[:, completed_games], 1 - results_array[completed_games])

    remaining_picks_matrix = picks_matrix[:, ~completed_games]

    # cell i, j is the score that player j would have if player i got all remaining picks correct
    max_remaining = np.dot(remaining_picks_matrix, remaining_picks_matrix.T)
    max_remaining += np.dot(1 - remaining_picks_matrix, 1 - remaining_picks_matrix.T)

    return current_scores[np.newaxis, :] + max_remaining


def calc_all_playoff_scenarios(picks_matrix, results_array, completed_games, playoff_points=None):
    """
    Input arrays are playoff games only
    Return a K, N matrix where K is number of remaining playoff scenarios and N is number of players.

    Row i is the scores for all players if the ith playoff scenario occurs.
    """
    # generates 2 ** num_remaining possible scenarios for remaining games
    num_remaining = np.sum(~completed_games)
    remaining_scenarios = np.array(list(itertools.product([0, 1], repeat=num_remaining)))

    scenarios = np.zeros(shape=(remaining_scenarios.shape[0], results_array.shape[0]))
    scenarios[:, completed_games] = results_array[completed_games]
    scenarios[:, ~completed_games] = remaining_scenarios

    max_scores = np.zeros(shape=(remaining_scenarios.shape[0], picks_matrix.shape[0]))

    for i in range(picks_matrix.shape[0]):
        max_scores[:, i] = np.apply_along_axis(calc_playoff_score, 1, scenarios, picks_matrix[i, :], playoff_points)

    return max_scores


def calc_playoff_score(playoff_picks, playoff_results, playoff_points=None):
    """
    For a single player. If playoff_points is None, assume no bonus.
    """
    if playoff_points is None:
        playoff_points = np.ones(playoff_picks.shape)

    actual_points = np.zeros(playoff_picks.shape)

    for i in range(actual_points.shape[0]):
        pick = int(playoff_picks[i])
        res = int(playoff_results[i])
        prev = PREV_GAMES[i][pick]

        # must pick this game correctly, and have picked parent game correctly
        if pick == res and (prev is None or actual_points[prev] > 0):
            actual_points[i] = playoff_points[i]

    return np.sum(actual_points)


if __name__ == "__main__":
    picks_a = [1, 1, 1, 1, 1, 1, 1]
    picks_b = [0, 0, 0, 0, 0, 0, 0]
    picks_c = [1, 0, 1, 0,
                 1,    0,
                    1]
    picks_d = [0, 1, 0, 1, 0, 1, 0]
    results = [1, 0, 0, 1, None, None, None]

    picks_matrix = np.array([picks_a, picks_b, picks_c, picks_d], dtype=float)
    results_array = np.array(results, dtype=float)
    completed_games = ~np.isnan(results_array)
    
    # max_non_playoff = calc_non_playoff_max_scores(picks_matrix, results_array, completed_games)
    # print("NON PLAYOFF", max_non_playoff)
    
    # max_playoff = calc_all_playoff_scenarios(picks_matrix, results_array, completed_games)
    # print("PLAYOFF", max_playoff)

    print(calc_best_finish(picks_matrix, results_array, completed_games))
