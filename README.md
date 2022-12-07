# Bowl Pickem
This repo contains the client side code and python lambda code for a College Football bowl picking web application. Currently the site is set up as a static site hosted in AWS S3, with a JSON data file containing picks and results. Whenever new picks are made a lambda call updates and republishes the data file. This eventually should turn into an actual database. 

## TODO
- Denote bonus point picks
	- Add bonus field in game
- Advanced picking style
- What to do about CFP
	- Assume last game is final, two preceeding are semis
	- Still 0/1 picks for each, but must get semi right to get final right

## Future Work
- Lock scoreboard for no more picks (flag is in data.json, but no implemented)
- Show points remaining
- Auto deploy for lambdas
- Error handling in lambdas to send error messages back in response rather than just "internal server error"
- Fix CORS policy in API
- Move data to DB

## data.json format
```
{
  year: {
    games: [{
      name
      teams: [a, b]
      teams_short: [a, b]
      date: [m, d, y]
      bonus: 0-n
      result: 0/1
      score: [x, y]
    },...]
    players: [{
      name
      advanced: true/false
      picks: [0/1,....]
      category: [1-6,...] (optional)
      spread: [0-n,...] (later)
    },...]

```


## Notes
Test with `python -m http.server`

S3 bucket: `bowl-pickem-public`

Static site endpoint: http://bowl-pickem-public.s3-website-us-east-1.amazonaws.com/

To update website code run `bash sync_code.sh` within directory

To update lambda code run `zip pickem_lambda.zip lambda_function.py`, then sync code as above, then within lambda function select "upload from s3" 

To update data.json (TODO: need to sync in other direction first) run `bash sync_data.sh` within directory

