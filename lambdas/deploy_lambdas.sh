#!/bin/bash

# Constants
STACK_NAME="bowl-pickem"
PREFIX="LambdaBowls"
SUFFIX="Name"

# Initialize force flag
FORCE_UPDATE=false
if [[ "$1" == "--force" ]]; then
    FORCE_UPDATE=true
fi

# Load CloudFormation parameters into associative array for lambda name lookups
declare -A CF_PARAMS
while IFS= read -r line; do
    key=$(echo "$line" | awk '{print $1}')
    value=$(echo "$line" | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Parameters[]' --output text | awk '{print $1, $2}')

# Process each lambda directory
for dir in */; do
    lambda_short_name="${dir%/}"

    # Skip utility directories
    if [[ "$lambda_short_name" == "common" || "$lambda_short_name" == "dev" ]]; then
        continue
    fi

    zip_file="${lambda_short_name}.zip"
    temp_file="temp/lambda_function.py"

    cd "$lambda_short_name"

    # Only zip if force flag is set or file has changed
    if [[ "$FORCE_UPDATE" = true || ! -f "$zip_file" || "lambda_function.py" -nt "$zip_file" ]]; then
        echo "Performing substitutions and updating ${zip_file}..."

        # Create temp directory for substitutions
        rm -rf "temp"
        mkdir -p "temp"
        cp "lambda_function.py" "$temp_file"

        # Replace SUB_ placeholders with actual values from CloudFormation
        for placeholder in $(grep -oP "SUB_[A-Za-z0-9_]*" "$temp_file"); do
            key="${placeholder#SUB_}"
            value="${CF_PARAMS[$key]}"
            if [[ -n "$value" ]]; then
                sed -i "s/$placeholder/\"$value\"/g" "$temp_file"
            else
                echo "Error: No value found for ${placeholder} in CloudFormation parameters from ${lambda_short_name}."
                rm -rf "temp"
                cd ..
                exit 1;
            fi
        done

        zip -j "$zip_file" "$temp_file"
        rm -rf "temp"
    else
        echo "${zip_file} is up-to-date."
    fi

    # Get full lambda name from CloudFormation parameters
    lambda_name="${CF_PARAMS[$PREFIX$lambda_short_name$SUFFIX]}"

    # Compare local file timestamp with deployed lambda timestamp
    lambda_modified=$(aws lambda get-function --function-name "$lambda_name" --query 'Configuration.LastModified' --output text)
    lambda_modified_epoch=$(date -d "$lambda_modified" +%s)
    zip_file_epoch=$(date -r "$zip_file" +%s)

    # Upload only if forced or local file is newer
    if [[ "$FORCE_UPDATE" = true || "$zip_file_epoch" -gt "$lambda_modified_epoch" ]]; then
        echo "Uploading ${zip_file} to AWS Lambda function ${lambda_name}..."
        aws lambda update-function-code --function-name "$lambda_name" --zip-file fileb://"$zip_file" --no-cli-pager > /dev/null 2>&1

        if [ $? -ne 0 ]; then
            echo "Error: Failed to update AWS Lambda function ${lambda_name}."
        fi
    else
        echo "Lambda ${lambda_name} is already up-to-date."
    fi

    echo ""
    cd ..
done

echo "Lambda deployment update complete!"

