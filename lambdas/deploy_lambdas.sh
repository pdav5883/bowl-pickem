#!/bin/bash

# Constants
STACK_NAME="bowl-pickem"
PREFIX="LambdaBowls"
SUFFIX="Name"

# Initialize force flag
FORCE_UPDATE=fals

if [[ $1 == "--force" ]]; then
  FORCE_UPDATE=true
fi

# Fetch CloudFormation parameters and store them in an associative array
declare -A CF_PARAMS
while IFS= read -r line; do
    key=$(echo $line | awk '{print $1}')
    value=$(echo $line | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Parameters[]" --output text | awk '{print $1, $2}')

# Loop through all directories in the current directory except for 'common'
for dir in */; do
    # lambda short name is directory name
    lambda_short_name=${dir%/}

    # Skip 'common' directory
    if [[ "$lambda_short_name" == "common" || "$lambda_short_name" == "dev" ]]; then
        continue
    fi

    zip_file="$lambda_short_name.zip"
    temp_file="temp/lambda_function.py"

    # Navigate into the directory
    cd "$lambda_short_name"

    # whether to zip lambda_function.py
    if [[ "$FORCE" = true || ! -f "$zip_file" || "lambda_function.py" -nt "$zip_file" ]]; then
        echo "Performing substitutions and updating $zip_file..."

        # Create the temp directory
        mkdir -p "temp"

        # Create a temporary copy of lambda_function.py
        cp lambda_function.py "$temp_file"

        # Perform the substitution for "SUB_" placeholders
        for placeholder in $(grep -oP '(?<=SUB_).*' "$temp_file"); do
            key="${placeholder#SUB_}"
            value="${CF_PARAMS[$key]}"
            if [[ -n "$value" ]]; then
                sed -i "s/$placeholder/$value/g" "$temp_file"
            else
                echo "Error: No value found for $placeholder in CloudFormation parameters from $lambda_short_name."
		rm -rf "temp"
		cd ..
		exit 1;
            fi
        done

        # Create or update the zip file containing lambda_function.py
        zip -j "$zip_file" "$temp_file"

        # Remove the temporary directory
        rm -rf "temp"
    else
        echo "$zip_file is up-to-date."
    fi

    lambda_name="${CF_PARAMS[$PREFIX$lambda_short_name$SUFFIX]}"

    # Check the last modified time of the AWS Lambda function
    lambda_modified=$(aws lambda get-function --function-name "$lambda_name" --query 'Configuration.LastModified' --output text)

    # Convert the last modified time to epoch seconds
    lambda_modified_epoch=$(date -d "$lambda_modified" +%s)
    zip_file_epoch=$(date -r "$zip_file" +%s)

    # Compare the modification times
    if [[ "$FORCE" = true || "$zip_file_epoch" -gt "$lambda_modified_epoch" ]]; then
        echo "Uploading $zip_file to AWS Lambda function $lambda_name..."
        aws lambda update-function-code --function-name "$lambda_name" --zip-file fileb://"$zip_file" --no-cli-pager > /dev/null 2>&1

	if [ $? -ne 0 ]; then
	  echo "Error: Failed to update AWS Lambda function $lambda_name."
	fi
    else
        echo "Lambda $lambda_name is already up-to-date."
    fi

    echo ""

    # Go back to the parent directory
    cd ..
done

echo "Lambda deployment update complete!"

