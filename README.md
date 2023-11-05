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

## Lambdas
- BowlsGetScoreboard: called from `{API}/pickem` `GET` requests. Reads the data files and returns information about game or results. See `lambdas/get_scoreboard`.
- BowlsUpdatePicks: called from `{API}/pickem` `POST` requests. Writes new picks to existing game file. See `lambdas/update_picks`.
- BowlsAdminEdit: called from `{API}/admin `POST` requests. Allows adjustment of bowl scores and game status. Requires authorization to execute via API gateway authorizer lambda. See `lambdas/admin_edit`
- BowlsAdminAuth: called indirectly as lambda authorizer for BowlsAdminEdit. Compares secret sent in header to secret stored in SSM. See `lambdas/admin_auth`.

## Future Work
- Move data to DB
- Edit/view picks after made
- Add point spread to advanced
- Show points remaining

## Data Files
### {year}/results.json format
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
### {year}/{gid}.json format
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
Test with `python -m http.server` from frontend

S3 bucket for frontend files: `bowl-pickem-public`

S3 bucket for data files: `bowl-pickem-private`

To update site code run `sh deploy.sh` from frontend directory

To update lambda run `sh deploy.sh` from lambda directory

API is at nstpyzzfae.execute-api.us-east-1.amazonaws.com
