const AWS_API_ID = "av5byg2t30"
const PRIMARY_ROUTE = "pickem"
const ADMIN_ROUTE = "admin"

const BASE_URL = "https://" + AWS_API_ID + ".execute-api.us-east-1.amazonaws.com"

export const API_URL = {
  primary: BASE_URL + "/" + PRIMARY_ROUTE,
  admin: BASE_URL + "/" + ADMIN_ROUTE,
}

