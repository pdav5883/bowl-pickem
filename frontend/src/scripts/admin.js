import { API_URL } from "./constants.js"
import { populateMenu } from "./shared.js"
import $ from "jquery"

// need to have keep these at global scope since year/gid
// needed by submitPicks, even when they come in as args
// also keep track of game type currently loaded

let typeArg
let yearArg
let gidArg

$(document).ready(function() {
  populateMenu()
  $("#yearsel").on("change", populateGameList)
  $("#subbutton").on("click", submitEdits)
  $("#gobutton").on("click", changeAdminPage)
  initAdminPage()
})


function initAdminPage() {
  $("#statustext").text("")
  populateYears(true) // also populates games
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
	game.textContent = gid.replace("-", " ")
	$("#gamesel").append(game)
      })
    }
  })
}


function populateResultsTable(year) {
  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: {"qtype": "bowls", "year": year},
    crossDomain: true,
    success: function(bowls) {
      // clear the table
      let table = document.getElementById("admintable")
      table.innerHTML = ""
      
      let row
      let cell
      
      // loop through all bowls
      bowls.forEach((bowl, i) => {
	row = table.insertRow()
	row.id = "bowl_" + i

	// bowl name
	cell = row.insertCell()
	cell.textContent = bowl.name
	
	// bowl date
	cell = row.insertCell()
	cell.textContent = bowl.date[0].toString() + "/" + bowl.date[1].toString() + "/" + bowl.date[2].toString()

	let score0 = ""
	let score1 = ""
	
	// check many conditions for unpopulated game
	if (bowl.score !== null &&
	    bowl.score.length !== 0 &&
	    bowl.score[0] !== null &&
	    bowl.score[0] !== "" &&
	    bowl.score[1] !== null &&
	    bowl.score[1] !== "") {
	  score0 = bowl.score[0]
	  score1 = bowl.score[1]
	}
	
	// score 0
	cell = row.insertCell()
	let team = document.createElement("label")
	team.setAttribute("for", "score0_" + i)
	team.textContent = bowl.teams[0]
	let score = document.createElement("input")
	score.id = "score0_" + i
	score.type = "number"
	score.value = score0
	cell.appendChild(team)
	cell.appendChild(score)

	// score 1
	cell = row.insertCell()
	team = document.createElement("label")
	team.setAttribute("for", "score1_" + i)
	team.textContent = bowl.teams[1]
	score = document.createElement("input")
	score.id = "score1_" + i
	score.type = "number"
	score.value = score1
	cell.appendChild(team)
	cell.appendChild(score)
      })
    }
  })
}


function populateGameTable(year, gid) {
  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: {"qtype": "scoreboard", "year": year, "gid": gid},
    crossDomain: true,
    success: function(game) {
      // clear the table
      let table = document.getElementById("admintable")
      table.innerHTML = ""

      let row = table.insertRow()
      let cell = row.insertCell()
      cell.textContent = "Show Results" 
      
      cell = row.insertCell()
      let select = makeBooleanSelect("selresults", game.show_results)
      cell.appendChild(select)

      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Show Picks"
      cell = row.insertCell()
      select = makeBooleanSelect("selpicks", game.show_picks)
      cell.appendChild(select)
      
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Lock Picks"
      cell = row.insertCell()
      select = makeBooleanSelect("sellock", game.lock_picks)
      cell.appendChild(select)
      
      game.players.forEach((player, i) => {
	row = table.insertRow()
	cell = row.insertCell()
	cell.setAttribute("id", "playerold" + i)
	cell.textContent = player.name
	
	cell = row.insertCell()
	let input = makeTextInput("playernew" + i, 12, player.name)
	cell.appendChild(input)
      })
    }  
  })
}


function makeBooleanSelect(id, current) {
  let select = document.createElement("select")
  select.id = id
  let option = document.createElement("option")
  option.value = true
  option.textContent = "True"
  select.appendChild(option)
  option = document.createElement("option")
  option.value = false
  option.textContent = "False"
  select.appendChild(option)

  if (current !== undefined) {
    select.value = current
  }

  return select
}


function makeTextInput(id, numchar=12, current="") {
  let input = document.createElement("input")
  input.setAttribute("type", "text")
  input.setAttribute("id", id)
  input.setAttribute("size", numchar)
  input.setAttribute("value", current)

  return input
}


function submitEdits() {
  if (typeArg === "results") {
    submitResultsEdits()
  }
  else if (typeArg === "game") {
    submitGameEdits()
  }
}

function submitGameEdits() {
  let table = document.getElementById("admintable")

  $("#statustext").text("")

  let data = {}
  data.show_results = ($("#selresults").val() === "true")
  data.show_picks = ($("#selpicks").val() === "true")
  data.lock_picks = ($("#sellock").val() === "true")

  let numplayers = $("[id^=playernew]").length

  // check to make sure we have the table count correct
  if (numplayers !== (table.rows.length - 3)) {
    $("#statustext").text("Row count error: check dropdown rows")
    return
  }

  data.players = {}

  for (let i = 0; i < numplayers; i++) {
    let oldname = $("#playerold" + i).text()
    let newname = $("#playernew" + i).val()
    data.players[oldname] = newname
  }

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: {"authorization": $("#pwdtext").val()},
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"etype": "game", "year": yearArg, "gid": gidArg, "data": data}),

    success: function() {
      $("#statustext").text("Success!")
    },

    error: function(err) {
      if (err.status == 403) {
	$("#statustext").text("Error: incorrect password")
      }
      else {
	$("#statustext").text("Error: unknown submission error")
      }
    }
  })
}


function submitResultsEdits() {
  let table = document.getElementById("admintable")

  $("#statustext").text("")

  let numbowls = table.rows.length
  let bowls = []

  for (let i = 0; i < table.rows.length; i++) {
    let bowl = {"result": null, "score": []}
    let score0 = parseInt($("#score0_" + i).val())
    let score1 = parseInt($("#score1_" + i).val())

    if (!isNaN(score0) && !isNaN(score1)) {
      bowl.score = [score0, score1]
      bowl.result = score0 > score1 ? 0 : 1
    }
    bowls.push(bowl)
  }

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: {"authorization": $("#pwdtext").val()},
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"etype": "results", "year": yearArg, "data": bowls}),

    success: function() {
      $("#statustext").text("Success!")
    },

    error: function(err) {
      if (err.status == 403) {
	$("#statustext").text("Error: incorrect password")
      }
      else {
	$("#statustext").text("Error: unknown submission error")
      }
    }
  })

}


function changeAdminPage() {
  typeArg = $("#typesel").val()
  yearArg = $("#yearsel").val()
  gidArg = $("#gamesel").val()
  
  $("#statustext").text("")

  if (typeArg === "results") {
    populateResultsTable(yearArg)
  }
  else if (typeArg === "game") {
    populateGameTable(yearArg, gidArg)
  }
}
