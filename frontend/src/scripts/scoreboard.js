import { API_URL, PREV_GAME } from "./constants.js"
import { populateMenu } from "./shared.js"
import $ from "jquery"


// window.onload = initScoreboardPage
$(document).ready(function() {
  populateMenu()
  $("#yearsel").on("change", populateGameList)
  $("#gobutton").on("click", changeGame)
  $("#editbutton").on("click", function() {
    editMode()
    populateYears(true)
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
      yearspan.setAttribute("class", "nowrap")
      title.appendChild(yearspan)

      let scores = populateScoreboard(game)
      populateLeaderboard(game, scores)

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
  
  // clear the table
  table.innerHTML = ""
  
  // header row with player names
  let row = document.createElement("tr")
  let cell = document.createElement("th")
  cell.textContent = ""
  row.appendChild(cell)

  game.players.forEach((player) => {
    cell = document.createElement("th")
    cell.textContent = player.name
    row.appendChild(cell)

    // these two arrays are used to keep track of playoff winners
    player.short_winner = []
    player.game_correct = []
  })

  table.appendChild(row)

  // score row inserted later

  const firstPlayoff = game.bowls.length - PREV_GAME[game.year].length

  // do all bowls except playoffs
  game.bowls.forEach((bowl, i) => {
    row = document.createElement("tr")
    cell = document.createElement("th")
    cell.setAttribute("class", "bowl-cell")

    // name of bowl
    let spanBowl = document.createElement("span")
    spanBowl.textContent = bowl.name

    if (bowl.bonus > 0) {
      spanBowl.textContent += " [+" + bowl.bonus + "]"
    }

    spanBowl.setAttribute("class", "bowl-span")
    cell.appendChild(spanBowl)
    cell.innerHTML += "<BR>"
	
    // head to head teams in bowl
    let spanTeam0 = document.createElement("span")
    let spanTeam1 = document.createElement("span")
    
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
      spanTeam0.setAttribute("class", "winner-span")
    }

    else if (bowl.result == 1) {
      spanTeam1.setAttribute("class", "winner-span")
    }
	
    cell.appendChild(spanTeam0)
    cell.innerHTML += " vs "
    cell.appendChild(spanTeam1)
    cell.innerHTML += "<BR>"
	
    // date of bowl
    let spanDate = document.createElement("span")
    spanDate.textContent = bowl.date[0].toString() + "/" + bowl.date[1].toString() + "/" + bowl.date[2].toString()
    spanDate.setAttribute("class", "date-span")
    cell.appendChild(spanDate)

    row.appendChild(cell)

    // each players pick for game
    game.players.forEach(player => {
      cell = document.createElement("td")

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
          cell.setAttribute("class", "win-cell")
        } 
        // pick is wrong
        else {
          cell.setAttribute("class", "loss-cell")
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
          cell.setAttribute("class", "loss-cell")
          player.game_correct.push(false)
        }
        // parent game is correct and this game not yet played
        else if (bowl.result === null) {
          player.game_correct.push(null)
        }
        // parent game is correct and this game is correct
        else if (bowl.result == player.picks[i]) {
          cell.setAttribute("class", "win-cell")
          player.game_correct.push(true)
        // parent game is correct and this game is wrong
        } 
        else {
          cell.setAttribute("class", "loss-cell")
          player.game_correct.push(false)
        }
      }
      row.appendChild(cell)
    })
    table.appendChild(row)
  })

  // final pass to add spaced header rows
  let breakRows = []
  let i = 0
  for (i = 8; i < table.children.length; i += 6) {
    breakRows.push(table.children[i])
  }

  let nameRow = table.children[0]

  breakRows.forEach((br) => {
    table.insertBefore(nameRow.cloneNode(true), br)
  })

  const scores = calcScores(game)

  // score row after header row
  row = document.createElement("tr")
  cell = document.createElement("td")
  cell.setAttribute("class", "score-cell")
  row.appendChild(cell)

  scores.forEach(score => {
    cell = document.createElement("td")
    cell.textContent = score
    cell.setAttribute("class", "score-cell")
    row.appendChild(cell)
  })

  table.insertBefore(row, table.children[1])

  return scores
}


function populateLeaderboard(game, scores) {
  
  if (scores === undefined) {
    scores = calcScores(game)
  }

  let leaders = []
  game.players.forEach((player, i) => {
    leaders.push({"name": player.name, "score": scores[i]})
  })

  // sort names by descending score
  leaders.sort((a, b) => ((a.score >= b.score) ? -1 : 1))
  //return ((a.score >= b.score) ? -1 : 1)})

  const table = document.getElementById("leadertable")

  // clear the table
  table.innerHTML = ""
  
  // header row with player names
  let row = document.createElement("tr")
  let cell = document.createElement("th")
  let sup = null
  cell.setAttribute("class", "leader-header")
  cell.textContent = "Rank"
  row.appendChild(cell)
  cell = document.createElement("th")
  cell.setAttribute("class", "leader-header")
  cell.textContent = "Name"
  row.appendChild(cell)
  cell = document.createElement("th")
  cell.setAttribute("class", "leader-header")
  cell.textContent = "Score"
  row.appendChild(cell)

  table.appendChild(row)

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
    cell.setAttribute("class", "num-cell")
    cell.textContent = rank
    sup = document.createElement("super")
    sup.textContent = ordinalSuper(rank)
    cell.appendChild(sup)
    row.appendChild(cell)

    cell = document.createElement("td")
    cell.textContent = leader.name
    row.appendChild(cell)

    cell = document.createElement("td")
    cell.setAttribute("class", "num-cell")
    cell.textContent = leader.score
    row.appendChild(cell)

    table.appendChild(row)

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

