const AWS_API_ID = OUT_ApiId
const PRIMARY_ROUTE = SUB_PrimaryRouteName
const ADMIN_ROUTE = SUB_AdminRouteName

const BASE_URL = "https://" + AWS_API_ID + ".execute-api.us-east-1.amazonaws.com"

export const API_URL = {
  primary: BASE_URL + "/" + PRIMARY_ROUTE,
  admin: BASE_URL + "/" + ADMIN_ROUTE,
}

