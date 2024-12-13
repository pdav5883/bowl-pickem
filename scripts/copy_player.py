import json
import boto3
from botocore.exceptions import ClientError
import argparse

def copy_player_between_games(year, from_game, to_game, player_name):
    s3 = boto3.client('s3')
    bucket_name = 'bowl-pickem-private'  # Replace with your S3 bucket name
    
    # Download both JSON files from S3
    try:
        # Get source game
        from_key = f'{year}/{from_game}.json'
        from_response = s3.get_object(Bucket=bucket_name, Key=from_key)
        from_data = json.loads(from_response['Body'].read().decode('UTF-8'))

        # Get destination game
        to_key = f'{year}/{to_game}.json'
        to_response = s3.get_object(Bucket=bucket_name, Key=to_key)
        to_data = json.loads(to_response['Body'].read().decode('UTF-8'))
        
    except ClientError as e:
        print(f"Error downloading files from S3: {e}")
        return

    # Find the player in the source game
    player_picks = None
    for player in from_data.get('players', []):
        if player['name'] == player_name:
            player_picks = player['picks']
            break

    if not player_picks:
        print(f"Player {player_name} not found in {from_game}")
        return

    # Check if player already exists in destination game
    for player in to_data.get('players', []):
        if player['name'] == player_name:
            print(f"Error: Player '{player_name}' already exists in {to_game}")
            return

    # Add the player to the destination game
    to_data['players'].append({"name": player_name, "picks": player_picks})

    # Upload the modified JSON back to S3
    try:
        json_data = json.dumps(to_data, indent=2).encode('utf-8')
        s3.put_object(
            Bucket=bucket_name,
            Key=to_key,
            Body=json_data,
            ContentType='application/json'
        )
        print(f"Successfully uploaded modified file to S3: {to_key}")
        
    except ClientError as e:
        print(f"Error uploading file to S3: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Copy a player between games')
    parser.add_argument('year', help='Game Year')
    parser.add_argument('from_game', help='Source game ID')
    parser.add_argument('to_game', help='Destination game ID')
    parser.add_argument('player_name', help='Name of the player to copy')
    
    args = parser.parse_args()
    
    copy_player_between_games(args.year, args.from_game, args.to_game, args.player_name)