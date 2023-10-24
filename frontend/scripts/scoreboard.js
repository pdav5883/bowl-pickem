let api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"


// window.onload = initScoreboardPage
$(document).ready(function() {
  $("#yearsel").on("change", populateGameList)
  $("#gobutton").on("click", changeGame)
  initScoreboardPage()
})


function initScoreboardPage() {
  // check for args to set year/gameid selects
  // TODO
  
  // check for localStorage to set year/gameid
  // TODO

  // if we have year/gameid show edit button, hide
  // TODO
  
  // populate scoreboard
  // populateGame({"year": year, "gid": gid})

  // if we don't have year/gameid hide edit button, show selects
  // TODO

  // populate select with years
  populateYears(true) // also populates games
}


function populateYears(defaultLatest) {
  $.ajax({
    method: "GET",
    url: api_url,
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
      // changeGame() will call here on .change()
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
    url: api_url,
    data: {"qtype": "games", "year": $("#yearsel").val()},
    crossDomain: true,
    success: function(res) {
      let game

      Object.keys(res).forEach(gid => {
	game = document.createElement("option")
	game.value = gid
	game.textContent = gid.replace("-", " ")
	$("#gamesel").append(game)
      })
    }
  })
}


function changeGame() {
  populateGame()

  // TODO: save config
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
    url: api_url,
    data: {"qtype": "scoreboard",
           "year":year,
           "gid": gid},
    crossDomain: true,
    success: function(game) {
      let title = document.getElementById("scoretitle")
      title.textContent = gid.replace("-", " ") + " "
      
      let yearspan = document.createElement("span")
      yearspan.textContent = year + "-" + (parseInt(year) + 1)
      yearspan.setAttribute("class", "nowrap")
      title.appendChild(yearspan)

      let scores = populateScoreboard(game)
      populateLeaderboard(game, scores)
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
  
  let scores = calcScores(game)
  
  let table = document.getElementById("scoretable")
  
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
  })

  table.appendChild(row)

  // score row
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

  table.appendChild(row)

  // row for each bowl, with picks for each player
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
    spanTeam0.textContent = bowl.teams[0]
    spanTeam1.textContent = bowl.teams[1]

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
      let semiInd

      // text in cell
      if (player.picks[i] == null) {
	cell.textContent = "?"
      }
      
      // special case for final
      else if (i == game.bowls.length - 1) {
	semiInd = i - 2 + player.picks[i]
	cell.textContent = game.bowls[semiInd].teams_short[player.picks[semiInd]]
	
	if (game.type == "advanced") {
	  cell.textContent += " - " + player.categories[i]
	}
      }

      else {
	cell.textContent = bowl.teams_short[player.picks[i]]
	
	if (game.type == "advanced") {
	  cell.textContent += " - " + player.categories[i]
	}
      }

      // has bowl been played?
      if (bowl.result !== null) {

	// style of cell
	if (bowl.result == player.picks[i]) {
	  cell.setAttribute("class", "win-cell")
        } 
        else {
	  cell.setAttribute("class", "loss-cell")
        }

        // special case for final (use semiInd from above special case)
        if (i == game.bowls.length - 1) {
	  if (bowl.result == player.picks[i] && game.bowls[semiInd].result == player.picks[semiInd]) {
	    cell.setAttribute("class", "win-cell")
	  }
	  else {
	    cell.setAttribute("class", "loss-cell")
	  }
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

  let table = document.getElementById("leadertable")

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
  let res = null

  // calculate number of points for game based on game type
  let points = function(bowlInd, playerInd) {
    if (game.type === "basic") {
      return 1 + game.bowls[bowlInd].bonus
    }
    else if (game.type === "advanced") {
      return game.players[playerInd].categories[bowlInd] + game.bowls[bowlInd].bonus
    }
  }
  
  // all but finals
  let i
  for (i = 0; i < game.bowls.length - 1; i++) {
    res = game.bowls[i].result

    if (res === null) {
      continue
    }

    game.players.forEach((player, j) => {
      if (player.picks[i] == res) {
	scores[j] += points(i, j)
      }
    })
  }

  // handle final
  let indSemi1 = game.bowls.length - 3
  let indSemi2 = game.bowls.length - 2
  let indFinal = game.bowls.length - 1

  resSemi1 = game.bowls[indSemi1].result
  resSemi2 = game.bowls[indSemi2].result
  resFinal = game.bowls[indFinal].result

  if (resFinal !== null) {
    game.players.forEach((player, j) => {
      if (player.picks[indFinal] == resFinal) {
	// also must pick the semi correctly
        if ((resFinal == 0 && player.picks[indSemi1] == resSemi1) || (resFinal == 1 && player.picks[indSemi2] == resSemi2)) {
	  scores[j] += points(indFinal, j)
	}
      }
    })
  }
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


//function initPopulateScoreboard() {
//  populateScoreboard(0)
//  getHistoricalYears()
//}

//function changeYear() {
//  var year = document.getElementById("yearsel").value
//  populateScoreboard(year)
//  scroll(0, 0)
//}


//function getHistoricalYears() {
//  var yearsel = document.getElementById("yearsel")
//  
//  // server returns the years that are available in the data file
//  $.ajax({
//    method: "GET",
//    url: api_url,
//    data: {"qtype": "years"},
//    crossDomain: true,
//    success: function(res) {
//      res.sort()
//      res.reverse()
//      res.forEach(function(item, index) {
//	var opt = document.createElement("option")
//	opt.innerHTML = item
//	opt.setAttribute("value", item)
//	yearsel.appendChild(opt)
//      })
//    }
//  })
//}


