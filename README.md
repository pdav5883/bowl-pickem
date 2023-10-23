# Bowl Pickem
This repo contains the client side code and python lambda code for a College Football bowl picking web application. Currently the site is set up as a static site hosted in AWS S3, with a set of JSON data files containing picks and results. Whenever new picks are made a lambda call updates and republishes the data file. This eventually should turn into an actual database. 

## TODO
- Allow multiple games
	- Scoreboard looks for localStorage game ID
	- Picks looks for query arg
- Functional
	- Option to lock scoreboard
	- Lambda error handling
	- Validate number of each category in advanced picker
	- Add point spread to advanced
- Cosmetic
	- BLR about 
	- Show points remaining
	- Store game ID in localstorage for next time
	- Looks for query arg on picks page
	- Option to copy picks to another game
- New game page
- Score edit page

## Future Work
- Move data to DB
- Edit/view picks after made

## year/results.json format
```
{
  "year": year,
  "bowls": [{
    "name": bowlname,
    "teams": [a, b],
    "teams_short": [a, b],
    "date": [m, d, y],
    "bonus": 0-n,
    "result": 0/1,
    "score": [x, y]
  },...]
}
```
### year/game-id.json format
```
{
  "year": year,
  "id": game-id,
  "type": advanced/basic
  "show_results": true/false,
  "show_picks": true/false,
  "lock_picks": true/false,
  "players": [{
    "name": name,
    "picks": [0/1,....]
    "category": [1-6,...] (optional)
    "spread": [0-n,...] (optional)
  },...]
}

```


## Notes
Test with `python -m http.server`

S3 bucket: `bowl-pickem-public`

To update website code run `bash sync_code.sh` within directory

To update lambda code run `zip pickem_lambda.zip lambda_function.py`, then sync code as above, then within lambda function select "upload from s3" 

To update data.json (TODO: need to sync in other direction first) run `bash sync_data.sh` within directory

