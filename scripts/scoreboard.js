let api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"

window.onload = initScoreboardPage

function calcScores( data ) {
  var scores = new Array(data.players.length).fill(0)
  var res = null
  var bonus = null
  
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


function initScoreboardPage() {
  // check for args to set year/gameid
  // TODO
  
  // check for localStorage to set year/gameid
  // TODO

  // if we have year/gameid show edit button, hide selects
  // TODO
  
  // populate scoreboard
  // TODO

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
      var yr

      for (var i = 0; i < res.length; i++) {
	yr = document.createElement("option")
	yr.value = res[i]
	yr.innerHTML = res[i]
	$("#yearsel").append(yr)
      }

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


function initPopulateScoreboard() {
  populateScoreboard(0)
  getHistoricalYears()
}

function changeYear() {
  var year = document.getElementById("yearsel").value
  populateScoreboard(year)
  scroll(0, 0)
}

function populateScoreboard(year){
  // need to use this form rather than $.getJSON in order to disable caching of data.json
  $.ajax({
    method: "GET",
    url: api_url,
    data: {"qtype": "scoreboard", "year": year},
    crossDomain: true,
    success: function(res) {
      //var titlestr = "Scoreboard " + res.year + "-" + (parseInt(res.year) + 1)
      //document.getElementById("scoretitle").innerHTML = titlestr
      var title = document.getElementById("scoretitle")
      title.innerHTML = "Scoreboard "
      var yearspan = document.createElement("span")
      yearspan.innerHTML = res.year + "-" + (parseInt(res.year) + 1)
      yearspan.setAttribute("class", "nowrap")
      title.appendChild(yearspan)
      populateScoreboardInner(res.data)
      populateLeaderboardInner(res.data)
    }
  })
}

function populateScoreboardInner(data) {
  // header row with player names
  // for each game
  //   write game name (mark with completed)
  //   for each player
  //     write pick (mark with winner loser)
  var scores = calcScores(data)
  var table = document.getElementById("scoretable")
  
  // clear the table
  table.innerHTML = ""
  
  // header row with player names
  var row = document.createElement("tr")
  var cell = document.createElement("th")
  cell.innerHTML = ""
  row.appendChild(cell)

  for (var j = 0; j < data.players.length; j++) {
    cell = document.createElement("th")
    cell.innerHTML = data.players[j].name
    row.appendChild(cell)
  }

  table.appendChild(row)

  // score row
  row = document.createElement("tr")
  cell = document.createElement("td")
  cell.setAttribute("class", "score-cell")
  var advlink = document.createElement("a")
  advlink.setAttribute("class", "invisi-link")
  advlink.setAttribute("href", "/advanced-scoreboard.html")
  advlink.innerHTML = "Total Points"
  cell.appendChild(advlink)
  row.appendChild(cell)

  for (var j = 0; j < data.players.length; j++) {
    cell = document.createElement("td")
    cell.innerHTML = scores[j]
    cell.setAttribute("class", "score-cell")
    row.appendChild(cell)
  }

  table.appendChild(row)

  // row for each game, with picks for each player
  var game = null
  var player = null
  
  for (var i = 0; i < data.games.length; i++) {
    game = data.games[i]
    row = document.createElement("tr")
    cell = document.createElement("th")
    cell.setAttribute("class", "bowl-cell")

    // name of bowl
    var span_bowl = document.createElement("span")
    span_bowl.innerHTML = game.name

    if (game.bonus > 0) {
      span_bowl.innerHTML += " [+" + game.bonus + "]"
    }

    span_bowl.setAttribute("class", "bowl-span")
    cell.appendChild(span_bowl)
    cell.innerHTML += "<BR>"
	
    // head to head teams in bowl
    var span_team0 = document.createElement("span")
    var span_team1 = document.createElement("span")
    span_team0.innerHTML = game.teams[0]
    span_team1.innerHTML = game.teams[1]

    if (game.result == 0) {
      span_team0.setAttribute("class", "winner-span")
    }

    else if (game.result == 1) {
      span_team1.setAttribute("class", "winner-span")
    }
	
    cell.appendChild(span_team0)
    cell.innerHTML += " vs "
    cell.appendChild(span_team1)
    cell.innerHTML += "<BR>"
	
    // date of bowl
    var span_date = document.createElement("span")
    span_date.innerHTML = game.date[0].toString() + "/" + game.date[1].toString() + "/" + game.date[2].toString()
    span_date.setAttribute("class", "date-span")
    cell.appendChild(span_date)

    row.appendChild(cell)

    // each players pick for game
    for (var j = 0; j < data.players.length; j++) {
      player = data.players[j]
      cell = document.createElement("td")

      // text in cell
      if (player.picks[i] == null) {
	cell.innerHTML = "?"
      }
      
      // special case for final
      else if (i == data.games.length - 1) {
	var semiInd = i - 2 + player.picks[i]
	cell.innerHTML = data.games[semiInd].teams_short[player.picks[semiInd]]
      }

      else {
	cell.innerHTML = game.teams_short[player.picks[i]]
      }

      // has game been played?
      if (game.result != null) {

	// style of cell
	if (game.result == player.picks[i]) {
	  cell.setAttribute("class", "win-cell")
        } 
        else {
	  cell.setAttribute("class", "loss-cell")
        }

        // special case for final (use semiInd from above special case)
        if (i == data.games.length - 1) {
	  if (game.result == player.picks[i] && data.games[semiInd].result == player.picks[semiInd]) {
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


function getHistoricalYears() {
  var yearsel = document.getElementById("yearsel")
  
  // server returns the years that are available in the data file
  $.ajax({
    method: "GET",
    url: api_url,
    data: {"qtype": "years"},
    crossDomain: true,
    success: function(res) {
      res.sort()
      res.reverse()
      res.forEach(function(item, index) {
	var opt = document.createElement("option")
	opt.innerHTML = item
	opt.setAttribute("value", item)
	yearsel.appendChild(opt)
      })
    }
  })
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
