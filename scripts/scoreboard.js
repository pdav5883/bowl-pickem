let api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"


// window.onload = initScoreboardPage
$(document).ready(function() {
  $("#yearsel").on("change", populateGames)
  $("#gamesel").on("change", changeGame)
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
    success: function(res) {
      let year

      res.forEach(yr => {
	year = document.createElement("option")
	year.value = yr
	yr.textContent = yr
	$("#yearsel").append(year)
      })

      // set to latest year
      // changeGame() will call here on .change()
      if (defaultLatest) {
	$("#yearsel").val(yr.value).change()
      }
    }
  })
}


function populateGames() {
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
	game.textContent = gid
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
           "year":year),
           "gid": gid},
    crossDomain: true,
    success: function(game) {
      let title = document.getElementById("scoretitle")
      title.textContent = "Scoreboard "
      
      let yearspan = document.createElement("span")
      yearspan.textContent = year + "-" + (parseInt(year) + 1)
      yearspan.setAttribute("class", "nowrap")
      title.appendChild(yearspan)

      // TODO correctly add gid
      title.textContent += " " + gid
      populateScoreboard(game)
      populateLeaderboard(game)
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
    cell.textContent += " vs "
    cell.appendChild(spanTeam1)
    cell.innerHTML += "<BR>"
	
    // date of bowl
    var spanDate = document.createElement("span")
    spanDate.textContent = bowl.date[0].toString() + "/" + bowl.date[1].toString() + "/" + bowl.date[2].toString()
    spanDate.setAttribute("class", "date-span")
    cell.appendChild(spanDate)

    row.appendChild(cell)

    // each players pick for game
    game.players.forEach(player => {
      cell = document.createElement("td")

      // text in cell
      if (player.picks[i] == null) {
	cell.textContent = "?"
      }
      
      // special case for final
      else if (i == game.bowls.length - 1) {
	let semiInd = i - 2 + player.picks[i]
	cell.textContent = game.bowls[semiInd].teams_short[player.picks[semiInd]]
      }

      else {
	cell.textContent = bowl.teams_short[player.picks[i]]
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
    }
    table.appendChild(row)
  }

  // final pass to add spaced header rows
  var arr = []
  for (var i = 8; i < table.children.length; i += 6) {
    arr.push(table.children[i])
  }

  var namerow = table.children[0]

  for (var i = 0; i < arr.length; i++) {
    table.insertBefore(namerow.cloneNode(true), arr[i])
  }
}


function populateLeaderboardInner(data) {
  
  var scores = calcScores(data)

  var leaders = []
  for (var i = 0; i < data.players.length; i++) {
    leaders.push({"name": data.players[i].name, "score": scores[i]})
  }

  // sort names by descending score
  leaders.sort(function(a, b) {
    return ((a.score >= b.score) ? -1 : 1)})

  var table = document.getElementById("leadertable")

  // clear the table
  table.innerHTML = ""
  
  // header row with player names
  var row = document.createElement("tr")
  var cell = document.createElement("th")
  var sup = null
  cell.setAttribute("class", "leader-header")
  cell.innerHTML = "Rank"
  row.appendChild(cell)
  cell = document.createElement("th")
  cell.setAttribute("class", "leader-header")
  cell.innerHTML = "Name"
  row.appendChild(cell)
  cell = document.createElement("th")
  cell.setAttribute("class", "leader-header")
  cell.innerHTML = "Score"
  row.appendChild(cell)

  table.appendChild(row)

  // row for each player, in order
  var lastRank = -1
  var lastScore = -1
  var rank = null

  for (var i = 0; i < leaders.length; i++) {
    if (leaders[i].score != lastScore) {
      rank = i + 1
      lastRank = rank
    }
    else {
      rank = lastRank
      //rank = "T-" + lastRank
    }

    row = document.createElement("tr")
    cell = document.createElement("td")
    cell.setAttribute("class", "num-cell")
    cell.innerHTML = rank
    sup = document.createElement("super")
    sup.innerHTML = ordinalSuper(rank)
    cell.appendChild(sup)
    row.appendChild(cell)

    cell = document.createElement("td")
    cell.innerHTML = leaders[i].name
    row.appendChild(cell)

    cell = document.createElement("td")
    cell.setAttribute("class", "num-cell")
    cell.innerHTML = leaders[i].score
    row.appendChild(cell)

    table.appendChild(row)

    lastScore = leaders[i].score
  }
}


function calcScores( data ) {
  let scores = new Array(data.players.length).fill(0)
  let res = null
  let bonus = null
  
  // all but finals
  for (var i = 0; i < data.games.length - 1; i++) {
    res = data.games[i].result
    bonus = data.games[i].bonus

    if (res == null) {
      continue
    }

    for (var j = 0; j < data.players.length; j++) {
      if (data.players[j].picks[i] == res) {
	scores[j] += 1 + bonus
      }
    }
  }

  // handle final
  var ind_semi1 = data.games.length - 3
  var ind_semi2 = data.games.length - 2
  var ind_final = data.games.length - 1

  res_semi1 = data.games[ind_semi1].result
  res_semi2 = data.games[ind_semi2].result
  res_final = data.games[ind_final].result
  bonus = data.games[ind_final].bonus

  if (res_final != null) {
    for (var j = 0; j < data.players.length; j++) {
      if (data.players[j].picks[ind_final] == res_final) {
	// also must pick the semi correctly
        if ((res_final == 0 && data.players[j].picks[ind_semi1] == res_semi1) || (res_final == 1 && data.players[j].picks[ind_semi2] == res_semi2)) {
	  scores[j] += 1 + bonus
	}
      }
    }
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


