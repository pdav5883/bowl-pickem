import { API_URL, NEXT_GAME } from "./constants.js"
import { populateMenu } from "./shared.js"

import {
  getValidAccessToken,
  getCookie
} from "blr-shared-frontend"

import $ from "jquery"

// need to have keep these at global scope since year/gid
// needed by submitPicks, even when they come in as args
// also keep track of game type currently loaded
let yearArg
let gidArg
let hasArgs
let gameType

$(function() {
  populateMenu()
  $("#yearsel").on("change", populateGameList)
  $("#subbutton1").on("click", submitPicks)
  $("#subbutton2").on("click", submitPicks)
  $("#joinbutton").on("click", changePickOptions)
  $("#scorebutton").on("click", goToScoreboard)
  $("#remaininglist").hide()
  $("#scorebutton").hide()
  initSubmitPage()
})


function initSubmitPage() {
  // check for args to set year/gameid selects
  const params = new URLSearchParams(window.location.search)

  if (params.has("year") && params.has("gid")) {
    $("#yearsel").hide()
    $("#gamesel").hide()
    $("#yearlab").hide()
    $("#gamelab").hide()
    $("#joinbutton").hide()

    yearArg = params.get("year")
    gidArg = params.get("gid")
    hasArgs = true
    attemptJoinGame(yearArg, gidArg)
  }
  
  else {
    $("#nametext").hide()
    $("#namelab").hide()
    $("#subbutton1").hide()
    $("#subbutton2").hide()

    hasArgs = false 

    populateYears(true) // also populates games
  }
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

function attemptJoinGame(year, gid) {
  $("#remaininglist").hide()

  // title of page
  let title = document.getElementById("picktitle")
  title.textContent = gid.replace(/-/g, " ") + " "
  
  let yearspan = document.createElement("span")
  yearspan.textContent = year + "-" + (parseInt(year) + 1)
  yearspan.setAttribute("class", "text-nowrap")
  title.appendChild(yearspan)

  // clear the table
  let table = document.getElementById("picktable")
  table.innerHTML = ""

  const accessToken = getValidAccessToken()
  if (!accessToken) {
    $("#statustext").text("Please login to join a game")
    return
  }

  const firstName = getCookie('blr-userFirstName')
  const lastName = getCookie('blr-userLastName')
  const pid = (firstName + " " + lastName).replace(" ", "__").lower()

  $("#nametext").val(firstName + " " + lastName)
  $("#nametext").show()
  $("#namelab").show()

  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: {"qtype": "scoreboard", "year": year, "gid": gid},
    crossDomain: true,
    success: function(game) {
      $("#statustext").text("")
      if (game.lock_picks) {
        $("#statustext").text("Picks are locked for this game!")
        return
      }

      if (game.players.some(player => player.name === pid)) {
        $("#statustext").text("You already submitted picks for this game!")
        return
      }
      populatePickOptions(game)
    }
  })
  
}

// need gid as arg to know if it's advanced
function populatePickOptions(game){
  let table = document.getElementById("picktable")
  if (game.type == "advanced") {
    $("#remaininglist").show()
  }
  
  game.bowls.forEach((bowl, i) => {
    let row = document.createElement("tr")
    let cell = document.createElement("th")

    // name of bowl
    let spanBowl = document.createElement("span")
    spanBowl.textContent = bowl.name

    if (bowl.bonus > 0) {
      spanBowl.textContent += " [+" + bowl.bonus + "]"
    }

    spanBowl.setAttribute("class", "fw-bold")
    cell.appendChild(spanBowl)
    cell.innerHTML += "<BR>"

    let aTeam0
    let aTeam1

    // teams in bowl
    if (bowl.hasOwnProperty("links")) {
      aTeam0 = document.createElement("a")
      aTeam1 = document.createElement("a")
      aTeam0.href = bowl.links[0]
      aTeam1.href = bowl.links[1]
      aTeam0.target = "_blank"
      aTeam1.target = "_blank"
      aTeam0.rel = "noopener noreferrer"
      aTeam1.rel = "noopener noreferrer"
    }
    
    else {
      aTeam0 = document.createElement("span")
      aTeam1 = document.createElement("span")
    }

    aTeam0.textContent = bowl.teams[0]
    aTeam1.textContent = bowl.teams[1]

    if (i == game.bowls.length - 1) {
      aTeam0.textContent = "?"
      aTeam1.textContent = "?"
    }

    cell.appendChild(aTeam0)
    cell.innerHTML += " vs "
    cell.appendChild(aTeam1)
    cell.innerHTML += "<BR>"

    // date of bowl
    let spanDate = document.createElement("span")
    spanDate.textContent = bowl.date[0].toString() + "/" + bowl.date[1].toString() + "/" + bowl.date[2].toString()
    spanDate.setAttribute("class", "small")
    cell.appendChild(spanDate)

    row.appendChild(cell)

    // pick options, with logic for CFP
    cell = document.createElement("td")
    let shortName = bowl.teams_short[0]

    if (i == game.bowls.length - 1) {
      shortName = "?"
    }

    let nameSpan = document.createElement("span")
    nameSpan.textContent = shortName
    cell.appendChild(nameSpan)
    cell.innerHTML += "<BR>"
    let radio = document.createElement("input")
    radio.setAttribute("type", "radio")
    radio.setAttribute("name", "bowl" + i)
    radio.setAttribute("value", 0)

    if (i >= game.bowls.length - NEXT_GAME[yearArg].length) {
      radio.addEventListener("change", updateBracket)
    }

    cell.appendChild(radio)
    row.appendChild(cell)

    cell = document.createElement("td")
    shortName = bowl.teams_short[1]

    if (i == game.bowls.length - 1) {
      shortName = "?"
    }

    nameSpan = document.createElement("span")
    nameSpan.textContent = shortName
    cell.appendChild(nameSpan)
    cell.innerHTML += "<BR>"
    radio = document.createElement("input")
    radio.setAttribute("type", "radio")
    radio.setAttribute("name", "bowl" + i)
    radio.setAttribute("value", 1)

    if (i >= game.bowls.length - NEXT_GAME[yearArg].length) {
      radio.addEventListener("change", updateBracket)
    }

    cell.appendChild(radio)
    row.appendChild(cell)

    if (gameType === "advanced") {
      // category pick
      cell = document.createElement("td")
      let dropdown = document.createElement("select")
      dropdown.setAttribute("name", "cat" + i)
      dropdown.setAttribute("class", "form-select form-select-sm")
      dropdown.addEventListener("change", updateCategories)
      let opt = document.createElement("option")

      // tournament games  always cat3
      if (i >= game.bowls.length - NEXT_GAME[yearArg].length) {
        opt.textContent = 3
        opt.setAttribute("value", 3)
        dropdown.appendChild(opt)
      }
      
      else {
        opt.textContent = "-"
        opt.setAttribute("value", "")
        dropdown.appendChild(opt)

        for (let k = 1; k <=6; k++) {
          opt = document.createElement("option")
          opt.textContent = k
          opt.setAttribute("value", k)
          dropdown.appendChild(opt)
        }
      }

      cell.appendChild(dropdown)
      row.appendChild(cell)

      // scratch field
      cell = document.createElement("td")
      let scratch = document.createElement("input")
      scratch.setAttribute("type", "text")
      scratch.setAttribute("class", "form-control form-control-sm")
      scratch.style.width = "100px"

      cell.appendChild(scratch)
      row.appendChild(cell) 
    }
    table.appendChild(row)
  })

  if (gameType === "advanced") {
    updateCategories()
  }
}

function updateBracketGame(gameIndex) {
  
  const [nextGameIndex, nextGameSlot] = NEXT_GAME[yearArg][gameIndex]
  const bracketGames = NEXT_GAME[yearArg].length

  // final always has null next game
  if (!nextGameIndex) {
    return
  }

  let table = document.getElementById("picktable")
  const gamePick = $("input[name=\"bowl" + (table.children.length - bracketGames + gameIndex) + "\"]:checked").val()

  const game = table.children[table.children.length - bracketGames + gameIndex]
  let nextGame = table.children[table.children.length - bracketGames + nextGameIndex]

  let teamLong
  let teamShort
  
  if (gamePick == 0) {
    teamLong = game.children[0].children[2].textContent
    teamShort = game.children[1].children[0].textContent
  }
  else if (gamePick == 1) {
    teamLong = game.children[0].children[3].textContent
    teamShort = game.children[2].children[0].textContent
  }
  else {
    teamLong = "?"
    teamShort = "?"
  }

  nextGame.children[0].children[2 + nextGameSlot].textContent = teamLong
  nextGame.children[1 + nextGameSlot].children[0].textContent = teamShort
}


function updateBracket() {
  const bracketGames = NEXT_GAME[yearArg].length
  for (let i = 0; i < bracketGames; i++) {
    updateBracketGame(i)
  }
}


function submitPicks() {
  // move to top of page
  window.scroll({top: 0, left: 0, behavior: "smooth"})

  // make sure that yearArg, gidArg match what is in sel
  if (!hasArgs && ((yearArg !== $("#yearsel").val()) || (gidArg !== $("#gamesel").val()))) {
    $("#statustext").text("Error: year/game dropdowns do not match picks table")
    return
  }

  let table = document.getElementById("picktable")

  $("#statustext").text("Submitting picks...")

  if ($("#nametext").val()  === "") {
    $("#statustext").text("Error: must enter a name")
    return
  }

  let numgames = table.rows.length
  let picks = []
  let categories = []

  if (gameType === "advanced") {
    if (!updateCategories()) {
      $("#statustext").text("Error: check categories remaining")
      return
    }
  }
      

  for (let i = 0; i < numgames; i++) {
    let pick = $("input[name=\"bowl" + i + "\"]:checked").val()

    if (pick === undefined) {
      $("#statustext").text("Error: all games must be selected")
      return
    }
    picks.push(pick)

    if (gameType === "advanced") {
      let category = $("select[name=\"cat" + i + "\"]").val()

      if (category === "") {
        $("#statustext").text("Error: all games must have category")
        return
      }
      categories.push(category)
    }
  }

  let data = {
    "name": $("#nametext").val(),
    "picks": picks
  }

  if (gameType === "advanced") {
    data["categories"] = categories
  }

  $.ajax({
    type: "POST",
    url: API_URL.primary,
    dataType: "json",
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"year": yearArg, "gid": gidArg, "data": data}),

    success: function() {
      $("#statustext").text("Success!")
      $("#scorebutton").show()
    },

    error: function(xhr) {
      let errorMessage = "Error: submission issue";
      if (xhr.responseText) {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage = errorResponse.message || errorMessage;
        } catch (e) {
          errorMessage = xhr.responseText;
        }
      }
      $("#statustext").text(errorMessage);
      $("#scorebutton").hide();
    }
  })

}


function updateCategories() {
  // returns true if categories have correct number of picks
  
  let remlist = document.getElementById("remaininglist")
  let numGames = document.getElementById("picktable").rows.length

  // start remaining with the total allowed, then decrement based on picks
  let catRemaining = Array(6).fill(Math.floor((numGames - 11) / 6))

  for (let i = 0; i < (numGames - 11) % 6; i++) {
    catRemaining[i]++
  }
  catRemaining[2] += 11 // the eleven CFP games

  // search for all select names beginning with cat, count categories
  $("select[name^=cat]").each(function () {
    let val = $(this).val()

    if (val !== "") {
      catRemaining[parseInt(val) - 1]--
    }
  })

  // populate categories remaining text
  for (var i = 1; i <= 6; i++) {
    remlist.children[i].children[0].textContent = catRemaining[i - 1]
  }

  // return true if all categories remaining are zero
  return catRemaining.every(item => item === 0)
}


function changePickOptions() {
  $("#scorebutton").hide()
  
  yearArg = $("#yearsel").val()
  gidArg = $("#gamesel").val()

  populatePickOptions(yearArg, gidArg)
}


function goToScoreboard() {
  window.location.href = "/?year=" + yearArg + "&gid=" + gidArg
}
