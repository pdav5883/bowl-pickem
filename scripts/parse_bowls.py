import re
import json
from datetime import datetime

# raw file from: https://bowlseason.com/services/schedule_txt.ashx?schedule=14

def to_camel_case(text):
    """Convert space-separated text to camel case."""
    words = text.lower().split()
    return ' '.join(word.capitalize() for word in words)

def parse_bowl_game_line(line):
    """
    Parse a single line of bowl game text to extract date, bowl name, and teams.
    
    Args:
        line (str): A line of text containing bowl game information
        
    Returns:
        dict: Dictionary containing date, bowl_name, team1, and team2
    """
    # Regular expression to match the components
    pattern = r"([A-Za-z]+ \d+).*?([A-Z][A-Z ]+BOWL)(.*?([A-Z ]+) vs ([A-Z ]+))?"
    
    match = re.search(pattern, line)
    if not match:
        return None
        
    date_str, bowl_name, teams_section, team1, team2 = match.groups()
    
    # Set teams to TBD if not found
    team1 = to_camel_case(team1.strip()) if team1 else "TBD"
    team2 = to_camel_case(team2.strip()) if team2 else "TBD"
    
    # Clean up and convert to camel case
    bowl_name = to_camel_case(bowl_name.strip())
    
    return {
        "date": date_str,
        "bowl_name": bowl_name,
        "team1": team1,
        "team2": team2
    }

def process_bowl_file(filename):
    """
    Process a file containing bowl game information.
    
    Args:
        filename (str): Path to the input file
        
    Returns:
        list: List of dictionaries containing parsed bowl game information
    """
    bowl_games = []
    
    try:
        with open(filename, 'r') as file:
            for line in file:
                if line.strip():  # Skip empty lines
                    result = parse_bowl_game_line(line)
                    if result:
                        bowl_games.append(result)
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found")
    except Exception as e:
        print(f"Error processing file: {e}")
        
    return bowl_games

def format_bowl_data(bowl_games):
    """Convert bowl games data to the desired JSON format."""
    formatted_games = []
    for game in bowl_games:
        # Parse the date (e.g., "December 30" -> [12, 30, 2024])
        # date_obj = datetime.strptime(game['date'], '%B %d')
        # date_list = [date_obj.month, date_obj.day, 2024]
        
        formatted_game = {
            "name": game['bowl_name'],
            "teams": [game['team1'], game['team2']],
            "date": game['date']
        }
        formatted_games.append(formatted_game)
    return formatted_games

def main():
    filename = "bowls_raw.txt"
    bowl_games = process_bowl_file(filename)
    
    # Format and save to JSON
    formatted_data = format_bowl_data(bowl_games)
    with open('results_2024.json', 'w') as f:
        json.dump(formatted_data, f, indent=2)
    
    print(f"\nResults have been saved to results_2024.json")

if __name__ == "__main__":
    main()