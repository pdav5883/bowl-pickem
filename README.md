# Bowl Pickem
This repo contains the frontend code and python lambda code for a College Football bowl picking web application. Currently the site is set up as a static site hosted in AWS S3, with a set of JSON data files containing picks and results. Whenever new picks are made a lambda call updates and republishes the data file. This eventually should turn into an actual database. 

## TODO
- Update scoreboard page to show "next/prev 3 games, bracket

## Long-term TODO
- Add endpoint for adding new game
- Use BLR utilities layer in lambdas
- Use BLR login with guest sign in


## Lambdas
- BowlsGetScoreboard: called from `{API}/pickem` `GET` requests. Reads the data files and returns information about game or results. See `lambdas/get_scoreboard`.
- BowlsUpdatePicks: called from `{API}/pickem` `POST` requests. Writes new picks to existing game file. See `lambdas/update_picks`.
- BowlsAdminEdit: called from `{API}/admin `POST` requests. Allows adjustment of bowl scores and game status. Requires authorization to execute via API gateway authorizer lambda. See `lambdas/admin_edit`
- BowlsAdminAuth: called indirectly as lambda authorizer for BowlsAdminEdit. Compares secret sent in header to secret stored in SSM. See `lambdas/admin_auth`.

## Deployment
### Infrastructure
The bowl-pickem specific AWS resources are defined and deployed using AWS CloudFormation (CFN). The resources are defined in the `bowl-pickem-cfn.yaml` file, with required parameters defined in `cfn-params.json`. All resources are deployed to the `bowl-pickem` stack.

### Backend
After the lambdas are created in the CFN stack, the code used to actually define what they do is uploaded in a separate deploy step using the `deploy.sh` script in each lambda folder. Any code in the lambda that uses values defined in the CFN stack (e.g. bucket names) use placeholders in the `lambda_function.py` file in the format `SUB_BucketReference`. In the deploy script prior to code upload these placeholders are substituted with actual values from the running CFN stack using the `aws cloudformation describe-stacks` command.

### Frontend
The frontend uses webpack to package scripts and assets for distribution. The weback configuration is defined in `webpack.config.js` with build steps and dependencies contained in `package.json`. For testing, webpack can serve the frontend locally using the command `npm build serve`. Running the `deploy.sh` in the `frontend` directory will build standalone files using the command `npm run build`. 

### Frontend Parameter Substitution
This was a huge pain to get working, and definitely not worth it, especially since it's not very elegant. For any frontend file that relies on variables either defined as parameters for the CFN Stack (e.g. route names) or outputs (e.g. API ID), the file needs a `SUB_ParameterId` (for parameters) or `OUT_OutputId` (for outputs) placeholder wherever a substitution is required. Then in the `webpack.config` file there is a plugin that performs variable substitution, so each of these `SUB` or `OUT` placeholders must be included there.

The plugin maps the placeholder to env variables of the process running the webpack command (i.e. `npm run`). These env variables are created in `package.json` as part of the `build` or `serve` script that ends up calling webpack. There is a `grab()` function defined in the script that queries the running CloudFormation stack for the parameter/output and then exports the variable to be used above. Each of the parameter/output substitutions must also be included in the script here.

## Future Work
- Move data to DB
- Edit/view picks after made
- Add point spread to advanced
- Show points remaining
- Option to copy picks to another game

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
Cache time is controlled with object metadata in S3. Set system `Cache-Control` header `max-age=XX` field to desired cache time in seconds. Currently set for 6 hours for .html, .js and.css, no limit for images. This only matters if the files themselves change, since game/results data is grabbed every time with API calls.
