import { API_URL, PREV_GAME } from "./constants.js"
import { populateMenu } from "./shared.js"
import $ from "jquery"

let currentGame
let currentScores

// window.onload = initScoreboardPage
$(document).ready(function() {
  populateMenu()
  $("#yearsel").on("change", populateGameList)
  $("#gobutton").on("click", changeGame)
  $("#editbutton").on("click", function() {
    editMode()
    populateYears(true)
  })
  $("#showBestFinish").on("change", function() {
    populateLeaderboard(currentGame, currentScores, $(this).is(":checked"))
  })
  initScoreboardPage()
})


function initScoreboardPage() {
  // check for args to set year/gameid selects
  const params = new URLSearchParams(window.location.search)

  // check for localStorage to set year/gameid
  if (params.has("year") && params.has("gid")) {
    displayMode()
    populateGame({"year": params.get("year"), "gid": params.get("gid")})
  }
  else if (localStorage.getItem("year") !== null && localStorage.getItem("gid") !== null) {
    displayMode()
    populateGame({"year": localStorage.getItem("year"), "gid": localStorage.getItem("gid")})
  }
  else {
    editMode()
    populateYears(true) // also populates games
  }

  addBestFinishPopup()
}


function editMode() {
  $("#editbutton").hide()
  $("#yearsel").show()
  $("#gamesel").show()
  $("#yearlab").show()
  $("#gamelab").show()
  $("#gobutton").show()
}


function displayMode() {
  $("#editbutton").show()
  $("#yearsel").hide()
  $("#gamesel").hide()
  $("#yearlab").hide()
  $("#gamelab").hide()
  $("#gobutton").hide()
}


function populateYears(defaultLatest) {
  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: {"qtype": "years"},
    crossDomain: true,
    success: function(years) {
      let yearOpt

      years.forEach((year) => {
        yearOpt = document.createElement("option")
        yearOpt.value = year
        yearOpt.textContent = year
        $("#yearsel").append(yearOpt)
      })

      // set to latest year
      // populateGameList() will be called on .change()
      if (defaultLatest) {
        $("#yearsel").val(yearOpt.value).change()
      }
    }
  })
}


function populateGameList() {
  // need to clear options, or list will always grow
  $("#gamesel").empty()

  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: {"qtype": "games", "year": $("#yearsel").val()},
    crossDomain: true,
    success: function(res) {
      let game

      Object.keys(res).forEach(gid => {
        game = document.createElement("option")
        game.value = gid
        game.textContent = gid.replace(/-/g, " ")
        $("#gamesel").append(game)
      })
    }
  })
}


function changeGame() {
  // nests within function to avoid passing click argument
  // to populateGame with jquery .on listener
  populateGame()
}


function populateGame(args){
  let year
  let gid

  if (args === undefined) {
    year = $("#yearsel").val() 
    gid = $("#gamesel").val()
  }
  else {
    year = args.year
    gid = args.gid
  }

  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: {"qtype": "scoreboard",
      "year":year,
      "gid": gid},
    crossDomain: true,
    success: function(game) {
      let title = document.getElementById("scoretitle")
      title.textContent = gid.replace(/-/g, " ") + " "
      
      let yearspan = document.createElement("span")
      yearspan.textContent = year + "-" + (parseInt(year) + 1)
      yearspan.setAttribute("class", "text-nowrap")
      title.appendChild(yearspan)

      let scores = populateScoreboard(game)
      currentGame = game
      currentScores = scores
      populateLeaderboard(game, scores, $("#showBestFinish").is(":checked"))

      // set localStorage for next time
      localStorage.setItem("year", year)
      localStorage.setItem("gid", gid)
    }
  })
}


function populateScoreboard(game) {
  // game = {bowls: [...], players: [...]
  // header row with player names
  // for each game
  //   write game name (mark with completed)
  //   for each player
  //     write pick (mark with winner loser)
  
  const table = document.getElementById("scoretable")
  table.classList.add("text-center")
  
  // clear the table
  table.innerHTML = ""
  const thead = document.createElement("thead")
  table.appendChild(thead)
  const tbody = document.createElement("tbody")
  table.appendChild(tbody)
  
  // header row with player names
  let row = document.createElement("tr")
  let cell = document.createElement("th")
  cell.textContent = ""
  cell.classList.add("px-2", "no-border")
  row.appendChild(cell)

  game.players.forEach((player) => {
    cell = document.createElement("th")
    cell.textContent = player.name
    row.appendChild(cell)

    // these two arrays are used to keep track of playoff winners
    player.short_winner = []
    player.game_correct = []
  })

  thead.appendChild(row)

  // score row inserted later

  const firstPlayoff = game.bowls.length - PREV_GAME[game.year].length

  // do all bowls except playoffs
  game.bowls.forEach((bowl, i) => {
    row = document.createElement("tr")
    cell = document.createElement("td")
    cell.classList.add("px-2")

    // name of bowl
    let spanBowl = document.createElement("span")
    spanBowl.textContent = bowl.name

    if (bowl.bonus > 0) {
      spanBowl.textContent += " [+" + bowl.bonus + "]"
    }

    spanBowl.setAttribute("class", "fw-bold bowl-name")
    cell.appendChild(spanBowl)
    cell.innerHTML += "<BR>"
	
    // head to head teams in bowl
    let spanTeam0 = document.createElement("span")
    spanTeam0.classList.add("small")
    let spanTeam1 = document.createElement("span")
    spanTeam1.classList.add("small")
    let spanvs = document.createElement("span")
    spanvs.classList.add("vs-separator")
    spanvs.textContent = " vs "
    
    // the index of the parent game for upper and lower in this game
    // need to define here for so it can also be used by player
    let prev0
    let prev1
    
    // not playoff
    if (i < firstPlayoff) {
      spanTeam0.textContent = bowl.teams[0]
      spanTeam1.textContent = bowl.teams[1]
    }
    // playoff
    else {
      const [relPrev0, relPrev1] = PREV_GAME[game.year][i - firstPlayoff]
      prev0 = relPrev0 !== null ? relPrev0 + firstPlayoff : null
      prev1 = relPrev1 !== null ? relPrev1 + firstPlayoff : null

      // first slot has no previous game
      if (prev0 == null) {
        spanTeam0.textContent = bowl.teams[0]
      }
      // previous game has been played
      else if (game.bowls[prev0].result != null) {
        spanTeam0.textContent = game.bowls[prev0].teams[game.bowls[prev0].result]
        bowl.teams[0] = spanTeam0.textContent
      }
      // previous game has not been played
      else {
        spanTeam0.textContent = "?"
      }

      // same for second slot
      if (prev1 == null) {
        spanTeam1.textContent = bowl.teams[1]
      }
      else if (game.bowls[prev1].result != null) {
        spanTeam1.textContent = game.bowls[prev1].teams[game.bowls[prev1].result]
        bowl.teams[1] = spanTeam1.textContent
      }
      else {
        spanTeam1.textContent = "?"
      }
    }

    if (bowl.result == 0) {
      spanTeam0.classList.add("text-decoration-underline", "fw-bold")
    }

    else if (bowl.result == 1) {
      spanTeam1.classList.add("text-decoration-underline", "fw-bold")
    }
	
    cell.appendChild(spanTeam0)
    cell.appendChild(spanvs)
    cell.appendChild(spanTeam1)
    cell.innerHTML += "<BR>"
	
    // date of bowl
    let spanDate = document.createElement("span")
    spanDate.textContent = bowl.date[0].toString() + "/" + bowl.date[1].toString() + "/" + bowl.date[2].toString()
    spanDate.classList.add("small")
    cell.appendChild(spanDate)

    row.appendChild(cell)

    // each players pick for game
    game.players.forEach(player => {
      cell = document.createElement("td")
      cell.classList.add("align-middle")

      // text in pick cell
      if (player.picks[i] == null) {
        cell.textContent = "?"
        player.short_winner.push(null) // doesn't matter what it is
      }
      else if (i < firstPlayoff) {
        cell.textContent = bowl.teams_short[player.picks[i]]

        if (game.type == "advanced") {
          cell.textContent += " - " + player.categories[i]
        }

        player.short_winner.push(null) // doesn't matter what it is
      }
      // playoff
      else {
        const prev = [prev0, prev1]
        if (prev[player.picks[i]] == null) {
          cell.textContent = bowl.teams_short[player.picks[i]]
          player.short_winner.push(bowl.teams_short[player.picks[i]])
        }
        else {
          cell.textContent = player.short_winner[prev[player.picks[i]]]
          player.short_winner.push(player.short_winner[prev[player.picks[i]]])
        }
      }

      // style of pick cell
      if (i < firstPlayoff) {
        // bowl is not played or picks not show
        if (bowl.result === null || player.picks[i] === null) {
          // no format
        }
        // pick is correct
        else if (bowl.result == player.picks[i]) {
          cell.classList.add("table-success")
        } 
        // pick is wrong
        else {
          cell.classList.add("table-danger")
        }
        player.game_correct.push(null) // doesn't matter what it is
      }
      // playoff
      else {
        const prev = [prev0, prev1]
        // pick not displayed
        if (player.picks[i] === null) {
          player.game_correct.push(null)
        }
        // parent game is wrong
        else if (player.game_correct[prev[player.picks[i]]] == false) {
          cell.classList.add("table-danger")
          player.game_correct.push(false)
        }
        // parent game is correct and this game not yet played
        else if (bowl.result === null) {
          player.game_correct.push(null)
        }
        // parent game is correct and this game is correct
        else if (bowl.result == player.picks[i]) {
          cell.classList.add("table-success")
          player.game_correct.push(true)
        // parent game is correct and this game is wrong
        } 
        else {
          cell.classList.add("table-danger")
          player.game_correct.push(false)
        }
      }
      row.appendChild(cell)
    })
    tbody.appendChild(row)
  })

  // final pass to add spaced header rows
  let breakRows = []
  let i = 0
  for (i = 8; i < table.children.length; i += 6) {
    breakRows.push(table.children[i])
  }

  let nameRow = table.children[0]

  breakRows.forEach((br) => {
    tbody.insertBefore(nameRow.cloneNode(true), br)
  })

  const scores = calcScores(game)

  // score row after header row
  row = document.createElement("tr")
  cell = document.createElement("td")
  cell.classList.add("fs-5", "px-2")
  row.appendChild(cell)

  scores.forEach(score => {
    cell = document.createElement("td")
    cell.textContent = score
    cell.classList.add("table-secondary","fw-bold", "fs-5")
    row.appendChild(cell)
  })

  thead.appendChild(row)

  // Equalize column widths (all non-first columns should be same width)
  equalizeColumnWidths()

  return scores
}


function equalizeColumnWidths() {
  const table = document.getElementById("scoretable")
  const rows = table.querySelectorAll("tr")
  
  if (rows.length === 0) return
  
  // Get all non-first-child cells from the first row to determine column count
  const firstRow = rows[0]
  const nonFirstCells = firstRow.querySelectorAll("th:not(:first-child), td:not(:first-child)")
  
  if (nonFirstCells.length === 0) return
  
  // First, reset all widths to auto to measure natural widths
  rows.forEach(row => {
    const cells = row.querySelectorAll("th:not(:first-child), td:not(:first-child)")
    cells.forEach(cell => {
      cell.style.width = "auto"
    })
  })
  
  // Measure the natural width of each column
  const columnWidths = []
  for (let i = 0; i < nonFirstCells.length; i++) {
    let maxWidth = 0
    rows.forEach(row => {
      const cells = row.querySelectorAll("th:not(:first-child), td:not(:first-child)")
      if (cells[i]) {
        const width = cells[i].offsetWidth
        if (width > maxWidth) {
          maxWidth = width
        }
      }
    })
    columnWidths.push(maxWidth)
  }
  
  // Find the maximum width among all non-first columns
  const maxColumnWidth = Math.max(...columnWidths)
  
  // Apply this width to all non-first columns
  rows.forEach(row => {
    const cells = row.querySelectorAll("th:not(:first-child), td:not(:first-child)")
    cells.forEach(cell => {
      cell.style.width = `${maxColumnWidth}px`
    })
  })
}


function populateLeaderboard(game, scores, showBestFinish) {
  if (scores === undefined) {
    scores = calcScores(game)
  }

  let leaders = []
  game.players.forEach((player, i) => {
    leaders.push({
      "name": player.name, 
      "score": scores[i],
      "best_finish": player.best_finish,
      "max_margin": player.max_margin
    })
  })

  // sort names by descending score
  leaders.sort((a, b) => ((a.score >= b.score) ? -1 : 1))

  const table = document.getElementById("leadertable")

  // clear the table
  table.innerHTML = ""
  const thead = document.createElement("thead")
  table.appendChild(thead)
  const tbody = document.createElement("tbody")
  table.appendChild(tbody)
  
  // header row with player names
  let row = document.createElement("tr")
  let cell = document.createElement("th")
  let sup = null
  cell.textContent = "#"
  cell.classList.add("text-center", "px-1")
  row.appendChild(cell)
  cell = document.createElement("th")
  cell.textContent = "Name"
  cell.classList.add("text-center")
  row.appendChild(cell)
  cell = document.createElement("th")
  cell.textContent = "Score"
  cell.classList.add("text-center")
  row.appendChild(cell)
  if (showBestFinish) {
    cell = document.createElement("th")
    cell.classList.add("text-center")
    cell.textContent = "Best "
    row.appendChild(cell)
  }

  thead.appendChild(row)

  // row for each player, in order
  let lastRank = -1
  let lastScore = -1
  let rank = null

  leaders.forEach((leader, i) => {
    if (leader.score != lastScore) {
      rank = i + 1
      lastRank = rank
    }
    else {
      rank = lastRank
    }

    row = document.createElement("tr")
    cell = document.createElement("td")
    cell.classList.add("text-center", "fw-bold", "small")
    cell.textContent = rank
    row.appendChild(cell)

    cell = document.createElement("td")
    cell.textContent = leader.name
    cell.classList.add("px-5")
    row.appendChild(cell)

    cell = document.createElement("td")
    cell.classList.add("text-center", "fw-bold")
    cell.textContent = leader.score
    row.appendChild(cell)

    if (showBestFinish) {
      cell = document.createElement("td")
      cell.classList.add("small", "text-center", "pl-2")
      cell.textContent = leader.best_finish
      sup = document.createElement("sup")
      sup.textContent = ordinalSuper(leader.best_finish)
      sup.classList.add("p-0")
      cell.appendChild(sup)
      const margin = document.createElement("span")
      margin.textContent = "(" + (leader.max_margin >= 0 ? "+" : "") + leader.max_margin + ")"
      cell.appendChild(margin)
      row.appendChild(cell)
    }

    tbody.appendChild(row)

    lastScore = leader.score
  })
}


function calcScores(game) {
  let scores = new Array(game.players.length).fill(0)

  // calculate number of points for game based on game type
  const points = function(bowlInd, playerInd) {
    if (game.type === "basic") {
      return 1 + game.bowls[bowlInd].bonus
    }
    else if (game.type === "advanced") {
      return game.players[playerInd].categories[bowlInd] + game.bowls[bowlInd].bonus
    }
  }

  const firstPlayoff = game.bowls.length - PREV_GAME[game.year].length
  
  // all but finals
  game.bowls.forEach((bowl, i) => {
    const res = bowl.result

    if (res === null) {
      return
    }

    let prev

    if (i >= firstPlayoff) {
      const [relPrev0, relPrev1] = PREV_GAME[game.year][i - firstPlayoff]
      const prev0 = relPrev0 !== null ? relPrev0 + firstPlayoff : null
      const prev1 = relPrev1 !== null ? relPrev1 + firstPlayoff : null
      prev = [prev0, prev1]
    }

    game.players.forEach((player, j) => {
      if (player.picks[i] != res) {
        return
      }

      if (i < firstPlayoff || player.game_correct[prev[res]] != false) {
        scores[j] += points(i, j)
      }
    })
  })

  return scores
}


function ordinalSuper(num) {
  if (num == 1) {
    return "st" }
  else if (num == 2) {
    return "nd" }
  else if (num == 3) {
    return "rd" }
  else {
    return "th"
  }
}

function addBestFinishPopup() {
  const popup = document.createElement("div")
    popup.setAttribute("class", "position-relative d-inline-block")
    popup.setAttribute("id", "bestpopup")
    popup.style.cursor = "pointer"

    popup.onclick = () => {
      const msg = document.getElementById("bestmsg")
      msg.classList.toggle("d-none")
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("width", "16")
    svg.setAttribute("height", "16")
    svg.setAttribute("viewBox", "10 10 80 80")
    
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "m68.699 60.301c3.5-5.1992 5.6016-11.398 5.6016-18.102 0-17.801-14.402-32.199-32.199-32.199-17.703 0-32.102 14.398-32.102 32.102 0 17.699 14.398 32.102 32.102 32.102 6.6992 0 12.898-2.1016 18.102-5.6016l19.602 19.602c1.1016 1.1016 2.6016 1.6992 4.1992 1.6992 1.6016 0 3.1016-0.60156 4.1992-1.6992 2.3008-2.3008 2.3008-6.1016 0-8.3984zm-26.598 10.898c-16 0-29.102-13-29.102-29.102 0-16 13-29.102 29.102-29.102 16 0 29.102 13 29.102 29.102-0.003906 16.102-13.004 29.102-29.102 29.102zm44 14.902c-1.1016 1.1016-3 1.1016-4.1016 0l-19.301-19.301c1.5-1.1992 2.8008-2.6016 4.1016-4.1016l19.301 19.301c1.0977 1.1016 1.0977 3 0 4.1016z")
    svg.appendChild(path)

    path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "m42.102 25.102c-5 0-9.1016 4.1016-9.1016 9.1016 0 0.89844 0.69922 1.5 1.5 1.5 0.89844 0 1.5-0.69922 1.5-1.5 0-3.3008 2.6992-6.1016 6.1016-6.1016 1.6016 0 3.1016 0.60156 4.3008 1.8008 1.1992 1.1992 1.8008 2.6992 1.8008 4.3008 0 1.8984-0.89844 3.6016-2.3984 4.8008-3.3008 2.6016-5.1992 6.3008-5.1992 10.199v0.30078c0 0.89844 0.69922 1.5 1.5 1.5 0.89844 0 1.5-0.69922 1.5-1.5v-0.30078c0-3 1.5-5.8008 4-7.8008 2.3008-1.6992 3.6016-4.3984 3.6016-7.1992 0-2.3984-1-4.6992-2.6992-6.3984-1.707-1.7031-4.0078-2.7031-6.4062-2.7031z")
    svg.appendChild(path)
    
    path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "m42.102 54.398c-1.3008 0-2.3984 1.1016-2.3984 2.3984 0 1.3984 1.1016 2.3984 2.3984 2.3984 1.3008 0 2.3984-1.1016 2.3984-2.3984 0-1.3984-1-2.3984-2.3984-2.3984z")
    svg.appendChild(path)
    popup.appendChild(svg)

    const span = document.createElement("span")
    span.setAttribute("class", "d-none position-absolute bg-dark text-white text-center rounded p-2")
    span.setAttribute("id", "bestmsg")
    span.style.width = "260px"
    span.style.top = "115%"
    span.style.left = "100%"
    span.style.zIndex = "1050"
    span.textContent = "Shows each player's best possible final rank and how much they would win by (+) or lose by (-)"
    popup.appendChild(span)

    document.getElementById("bestFinishPopup").appendChild(popup)
}


