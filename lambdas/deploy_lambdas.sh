#!/bin/bash

# Constants
STACK_NAME="bowl-pickem"
LAYER_NAME_KEYS=()
PREFIX="Lambda"
SUFFIX="Name"

# Initialize force flag
FORCE_UPDATE=fals

if [ "$1" == "--force" ]; then
  FORCE_UPDATE=true
fi

# Use TARGET_DIR if provided, otherwise use all directories
if [ -n "$1" ] && [ "$1" != "--force" ]; then
    dirs="$1/"
else
    dirs="*/"
fi

# Fetch CloudFormation parameters and store them in an associative array
declare -A CF_PARAMS
while IFS= read -r line; do
    key=$(echo $line | awk '{print $1}')
    value=$(echo $line | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Parameters[]" --output text | awk '{print $1, $2}')

while IFS= read -r line; do
    key=$(echo $line | awk '{print $1}')
    value=$(echo $line | awk '{print $2}')
    CF_PARAMS["$key"]="$value"
done < <(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[]" --output text | awk '{print $1, $2}')

# Process layer information for each layer name key
layer_names=()
layer_versions=()
layer_arns=()
layer_modified_epochs=()

for layer_key in "${LAYER_NAME_KEYS[@]}"; do
    layer_name="${CF_PARAMS[$layer_key]}"
    if [[ -n "$layer_name" ]]; then
        layer_version=$(aws lambda list-layer-versions --layer-name "$layer_name" --query 'LayerVersions[0].Version' --output text)
        layer_arn=$(aws lambda get-layer-version --layer-name "$layer_name" --version-number "$layer_version" --query 'LayerVersionArn' --output text)
        layer_modified=$(aws lambda get-layer-version --layer-name "$layer_name" --version-number "$layer_version" --query 'CreatedDate' --output text)
        layer_modified_epoch=$(date -d "$layer_modified" +%s)
        
        layer_names+=("$layer_name")
        layer_versions+=("$layer_version")
        layer_arns+=("$layer_arn")
        layer_modified_epochs+=("$layer_modified_epoch")
    else
        echo "Warning: No layer name found for key: $layer_key"
    fi
done

for dir in $dirs; do
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
    if [[ "$FORCE_UPDATE" = true || ! -f "$zip_file" || "lambda_function.py" -nt "$zip_file" ]]; then
        echo "Performing substitutions and updating $zip_file..."

        # Create the temp directory
        mkdir -p "temp"

        # Create a temporary copy of lambda_function.py
        cp lambda_function.py "$temp_file"

        # Perform the substitution for "SUB_" placeholders
        for placeholder in $(grep -oP 'SUB_[A-Za-z0-9_]*' "$temp_file"); do
            key="${placeholder#SUB_}"
            value="${CF_PARAMS[$key]}"
            if [[ -n "$value" ]]; then
                sed -i "s/$placeholder/\"$value\"/g" "$temp_file"
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

    # Compare the modification times to update lambda
    if [[ "$FORCE_UPDATE" = true || "$zip_file_epoch" -gt "$lambda_modified_epoch" ]]; then
        echo "Uploading $zip_file to AWS Lambda function $lambda_name..."
        aws lambda update-function-code --function-name "$lambda_name" --zip-file fileb://"$zip_file" --no-cli-pager > /dev/null 2>&1

	if [ $? -ne 0 ]; then
	  echo "Error: Failed to update AWS Lambda function $lambda_name."
	fi
    else
        echo "Lambda $lambda_name is already up-to-date."
    fi

    # Update layers for this lambda
    layers_to_update=()
    layers_needed_update=false
    
    for i in "${!layer_names[@]}"; do
        layer_name="${layer_names[$i]}"
        layer_arn="${layer_arns[$i]}"
        layer_modified_epoch="${layer_modified_epochs[$i]}"
        
        if [[ -n "$layer_name" && -n "$layer_arn" ]]; then
            if [[ "$FORCE_UPDATE" = true || $layer_modified_epoch -gt $lambda_modified_epoch ]]; then
                layers_needed_update=true
                layers_to_update+=("$layer_arn")
                echo "Layer $layer_name needs update"
            else
                layers_to_update+=("$layer_arn")
                echo "Layer $layer_name is already up-to-date."
            fi
        fi
    done
    
    if [[ "$layers_needed_update" = true ]]; then
        echo "Updating $lambda_name with layer versions..."
        # wait to make sure that the code update completes before trying layer version update
        aws lambda wait function-updated --function-name $lambda_name
        aws lambda update-function-configuration --function-name $lambda_name --layers "${layers_to_update[@]}" > /dev/null
    fi

    echo ""

    # Go back to the parent directory
    cd ..
done

echo "Lambda deployment update complete!"

