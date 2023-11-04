# Bowl Pickem
This repo contains the client side code and python lambda code for a College Football bowl picking web application. Currently the site is set up as a static site hosted in AWS S3, with a set of JSON data files containing picks and results. Whenever new picks are made a lambda call updates and republishes the data file. This eventually should turn into an actual database. 

## TODO
- Cosmetic
	- BLR about
	- After submit scroll to top
	- Option to copy picks to another game
	- Clear form after submission
	- Links for teams and bowl
	- Update cache duration settings for page
	- Blue go button

## Admin
- Special lambda BowlsAdminEdit allows adjustment of bowl scores
- /admin route in API gateway requires authorization, uses BowlsAdminAuth lambda to check password against secret stored in SSM
- 

## Future Work
- Move data to DB
- Edit/view picks after made
- Add point spread to advanced
- Show points remaining

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
    "result": 0/1, null/None if not played
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

