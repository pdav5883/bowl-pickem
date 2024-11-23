const AWS_API_ID = SUB_ApiId
const PRIMARY_ROUTE = SUB_PrimaryRouteName
const ADMIN_ROUTE = SUB_AdminRouteName

const BASE_URL = "https://" + AWS_API_ID + ".execute-api.us-east-1.amazonaws.com"

export const API_URL = {
  primary: BASE_URL + "/" + PRIMARY_ROUTE,
  admin: BASE_URL + "/" + ADMIN_ROUTE,
}

// definitions of child and parentgames in 4 and 12 team playoffs, second value in tuple is upper/lower slot
const NEXT4 = [[2, 0], [2, 1], [null, null]]
const PREV4 = [[null, null], [null, null], [0, 1]]

const NEXT12 = [[4, 1], [5, 1], [6, 1], [7, 1],
[8, 0], [8,1], [9, 0], [9, 1],
[10, 0], [10, 1],
[null, null]]
const PREV12 = [[null, null], [null, null], [null, null], [null, null],
[null, 0], [null, 1], [null, 2], [null, 3],
[4, 5], [6, 7],
[8, 9]]

export const NEXT_GAME = {2020: NEXT4, 2021: NEXT4, 2022: NEXT4, 2023: NEXT4,
  2024: NEXT12, 2025: NEXT12, 2026: NEXT12}

export const PREV_GAME = {2020: PREV4, 2021: PREV4, 2022: PREV4, 2023: PREV4,
  2024: PREV12, 2025: PREV12, 2026: PREV12}


/*
a/b   c/d    e/f    g/h
0      1      2      3
i/w0  j/w1   k/w2   l/w3
4      5      6      7
  w4/w5        w6/w7
   8            9
        w8/w9
         10\
*/