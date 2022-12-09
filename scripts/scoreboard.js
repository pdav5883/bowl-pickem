let api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"

window.onload = initPopulateScoreboard

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
  cell.innerHTML = "Total Points"
  cell.setAttribute("class", "score-cell")
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
