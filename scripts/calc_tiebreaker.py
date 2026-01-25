import json
import boto3
from botocore.exceptions import ClientError
import argparse

def calc_points_differential(year, game):
    s3 = boto3.client('s3')
    bucket_name = 'bowl-pickem-private'  # Replace with your S3 bucket name
    
    # Download both JSON files from S3
    try:
        # Get game and results
        game_key = f'{year}/{game}.json'
        game_response = s3.get_object(Bucket=bucket_name, Key=game_key)
        game_data = json.loads(game_response['Body'].read().decode('UTF-8'))

        results_key = f'{year}/results.json'
        results_response = s3.get_object(Bucket=bucket_name, Key=results_key)
        results_data = json.loads(results_response['Body'].read().decode('UTF-8'))
        
    except ClientError as e:
        print(f"Error downloading files from S3: {e}")
        return
    
    points = [0] * len(game_data["players"])

    for i, result in enumerate(results_data["bowls"]):
        if result["bonus"] > 0:
            # ignore playoff games
            continue
        diff = abs(result["score"][0] - result["score"][1])
        for j, player in enumerate(game_data["players"]):
            if result["result"] == player["picks"][i]:
                points[j] += diff
            else:
                points[j] -= diff

    print(f"==== {game} ====")
    print("Total point differentials ")

    for player, diff in zip(game_data["players"], points):
        print(f"{player['name']}: {diff}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Compute the sum of points differential in correct picks, not counting playoffs')
    parser.add_argument('year', help='Game Year')
    parser.add_argument('game', help='Source game ID')

    args = parser.parse_args()
    
    calc_points_differential(args.year, args.game)