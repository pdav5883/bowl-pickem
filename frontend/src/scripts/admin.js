import {
  API_URL,
  PREV_GAME } from "./constants.js"

import {
  populateMenu,
  populateGameList,
  populateYears
 } from "./shared.js"

import {
  initButtons,
  spinnerOn,
  spinnerOff,
  getValidAccessToken
} from "blr-shared-frontend"

import $ from "jquery"

// need to have keep these at global scope since year/gid
// needed by submitPicks, even when they come in as args
// also keep track of game type currently loaded

let typeArg
let yearArg
let gidArg

$(function() {
  populateMenu()
  initButtons(["gobutton", "submitbutton"])

  $("#yearsel").on("change", populateGameList)
  $("#submitbutton").on("click", async () => {
    spinnerOn("submitbutton")

    await submitEdits(() => {
      spinnerOff("submitbutton")
    })
  })
  $("#gobutton").on("click", changeAdminPage)
  initAdminPage()
})


function initAdminPage() {
  $("#statustext").text("")
  populateYears(true) // also populates games
}


function populateResultsTable(year) {
  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: {"qtype": "bowls", "year": year},
    crossDomain: true,
    success: function(results) {
      // clear the table
      const bowls = results.bowls

      let table = document.getElementById("admintable")
      table.innerHTML = ""
      
      let row
      let cell

      // Add header row for calc_margin setting
      row = table.insertRow()
      cell = row.insertCell()
      cell.textContent = "Calculate Margins"
      
      cell = row.insertCell()
      const select = makeBooleanSelect("selmargins", results.calc_margin)
      cell.appendChild(select)


      const prevGame = PREV_GAME[year]
      const firstPlayoff = bowls.length - prevGame.length
      
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
        cell.classList.add("small")

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

        // grab team names
        let team0
        let team1

        if (i < firstPlayoff) {
          team0 = bowl.teams[0]
          team1 = bowl.teams[1]
        }
        else {
          const [relPrev0, relPrev1] = prevGame[i - firstPlayoff]
          const prev0 = relPrev0 !== null ? relPrev0 + firstPlayoff : null
          const prev1 = relPrev1 !== null ? relPrev1 + firstPlayoff : null
          
          if (prev0 === null || bowls[prev0].result === null) {
            team0 = bowl.teams[0]
          }
          else {
            team0 = bowls[prev0].teams[bowls[prev0].result]
            bowl.teams[0] = team0
          }

          if (prev1 === null || bowls[prev1].result === null) {
            team1 = bowl.teams[1]
          }
          else {
            team1 = bowls[prev1].teams[bowls[prev1].result]
            bowl.teams[1] = team1
          }

        }
	
        // score 0
        cell = row.insertCell()
        let team = document.createElement("label")
        team.setAttribute("for", "score0_" + i)
        team.textContent = team0
        team.classList.add("small")
        let score = document.createElement("input")
        score.id = "score0_" + i
        score.type = "number"
        score.size = 3
        score.value = score0
        score.classList.add("form-control")
        cell.appendChild(team)
        cell.appendChild(score)

        // score 1
        cell = row.insertCell()
        team = document.createElement("label")
        team.setAttribute("for", "score1_" + i)
        team.textContent = team1
        team.classList.add("small")
        score = document.createElement("input")
        score.id = "score1_" + i
        score.type = "number"
        score.size = 3
        score.value = score1
        score.classList.add("form-control")
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

async function submitEdits(callback) {
  if (typeArg === "results") {
    await submitResultsEdits(callback)
  }
  else if (typeArg === "game") {
    await submitGameEdits(callback)
  }
}

async function submitGameEdits(callback) {
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
    headers: { "authorization": await getValidAccessToken() },
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"etype": "game", "year": yearArg, "gid": gidArg, "data": data}),

    success: function() {
      $("#statustext").text("Success!")
      if (callback) callback()
    },

    error: function(err) {
      if (err.status == 403) {
        $("#statustext").text("Error: incorrect password")
      }
      else {
        $("#statustext").text("Error: unknown submission error")
      }
      if (callback) callback()
    }
  })
}


async function submitResultsEdits(callback) {
  let table = document.getElementById("admintable")

  $("#statustext").text("")

  const numbowls = table.rows.length - 1 // must account for calc_margin row
  let bowls = []

  for (let i = 0; i < numbowls; i++) {
    let bowl = {"result": null, "score": []}
    let score0 = parseInt($("#score0_" + i).val())
    let score1 = parseInt($("#score1_" + i).val())

    if (!isNaN(score0) && !isNaN(score1)) {
      bowl.score = [score0, score1]
      bowl.result = score0 > score1 ? 0 : 1
    }
    bowls.push(bowl)
  }

  let data = {"calc_margin": ($("#selmargins").val() === "true"), "bowls": bowls}

  $.ajax({
    type: "POST",
    url: API_URL.admin,
    headers: {"authorization": await getValidAccessToken()},
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"etype": "results", "year": yearArg, "data": data}),

    success: function() {
      $("#statustext").text("Success!")
      if (callback) callback()
    },

    error: function(err) {
      if (err.status == 403) {
        $("#statustext").text("Error: incorrect password")
      }
      else {
        $("#statustext").text("Error: unknown submission error")
      }
      if (callback) callback()
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
