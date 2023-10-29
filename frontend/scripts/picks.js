const api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"

// need to have keep these at global scope since year/gid
// needed by submitPicks, even when they come in as args
let yearArg
let gidArg

$(document).ready(function() {
  $("#yearsel").on("change", populateGameList)
  $("#subbutton1").on("click", submitPicks)
  $("#subbutton2").on("click", submitPicks)
  $("#gobutton").on("click", changePickOptions)
  initSubmitPage()()
})


function initSubmitPage() {
  // check for args to set year/gameid selects
  const params = new URLSearchParams(window.location.search)

  if (params.has("year") && params.has("gid")) {
    $("#yearsel").hide()
    $("#gamesel").hide()
    $("#yearlab").hide()
    $("#gamelab").hide()
    $("#gobutton").hide()

    yearArg = params.get("year")
    gidArg = params.get("gid")
    
    populatePickOptions(yearArg, gidArg)
  }
  
  else {
    populateYears(true) // also populates games
  }
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

// need gid as arg to know if it's advanced
function populatePickOptions(year, gid){
  $.ajax({
    method: "GET",
    url: api_url,
    data: {"qtype": "scoreboard", "year": year, "gid": gid},
    crossDomain: true,
    success: function(game) {
      // title of page
      let title = document.getElementById("titlestr")
      title.textContent = gid.replace("-", " ") + " "
      
      let yearspan = document.createElement("span")
      yearspan.textContent = year + "-" + (parseInt(year) + 1)
      yearspan.setAttribute("class", "nowrap")
      title.appendChild(yearspan)

      // clear the table
      let table = document.getElementById("picktable")
      table.innerHTML = ""
      
      // TODO check for game locked
      // if (game.lock_picks)

      game.bowls.forEach((bowl, i) => {
	let row = document.createElement("tr")
	let cell = document.createElement("th")
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

	// teams in bowl
	let spanTeam0 = document.createElement("span")
	let spanTeam1 = document.createElement("span")
	spanTeam0.textContent = bowl.teams[0]
	spanTeam1.textContent = bowl.teams[1]

	if (i == game.bowls.length - 1) {
	  spanTeam0.textContent = "?"
	  spanTeam1.textContent = "?"
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

	// pick options, with logic for CFP
	cell = document.createElement("td")
	let shortName = bowl.teams_short[0]
	
	if (i == game.bowls.length - 1) {
	  shortname = "?"
	}

	let nameSpan = document.createElement("span")
	nameSpan.textContent = shortName
	cell.appendChild(nameSpan)
	cell.innerHTML += "<BR>"
	let radio = document.createElement("input")
	radio.setAttribute("type", "radio")
	radio.setAttribute("name", "bowl" + i)
	radio.setAttribute("value", 0)

	if (i == game.bowls.length - 2 || i == game.bowls.length - 3) {
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
	
	if (i == game.bowls.length - 2 || i == game.bowls.length - 3) {
	  radio.addEventListener("change", updateBracket)
	}
	
	cell.appendChild(radio)
	row.appendChild(cell)
        
	table.appendChild(row)
      }
    }
  })
}


function updateBracket() {
  let table = document.getElementById("picktable")
  
  let pickSemi1 = $('radio[name="bowl' + (table.children.length - 3) + '"]').val()
  let pickSemi2 = $('radio[name="bowl' + (table.children.length - 2) + '"]').val()

  let semi1 = table.children[table.children.length - 3]
  let semi2 = table.children[table.children.length - 2]
  let fina = table.children[table.children.length - 1]

  if (pickSemi1 == "") {
    fina.children[0].children[2].textContent = "?"
    fina.children[1].children[0].textContent = "?"
  }
  else if (pickSemi1 == 0) {
    fina.children[0].children[2].textContent = semi1.children[0].children[2].textContent
    fina.children[1].children[0].textContent = semi1.children[1].children[0].textContent
  }
  else if (pickSemi1 == 1) {
    fina.children[0].children[2].textContent = semi1.children[0].children[3].textContent
    fina.children[1].children[0].textContent = semi1.children[2].children[0].textContent
  }

  
  if (pickSemi2 == "") {
    fina.children[0].children[3].textContent = "?"
    fina.children[2].children[0].textContent = "?"
  }
  else if (pickSemi2 == 0) {
    fina.children[0].children[3].textContent = semi2.children[0].children[2].textContent
    fina.children[2].children[0].textContent = semi2.children[1].children[0].textContent
  }
  else if (pickSemi2 == 1) {
    fina.children[0].children[3].textContent = semi2.children[0].children[3].textContent
    fina.children[2].children[0].textContent = semi2.children[2].children[0].textContent
  }
}


function submitPicks() {
  // look in yearArg, gidArg global variables
  // TODO: make sure that yearArg, gidArg match what's in the sel
  // so that user doesn't change dropdown without hitting go
  let statustext = document.getElementById("statustext")
  let table = document.getElementById("picktable")

  $("#statustext").text("")

  if ($("#nametext").val()  === "") {
    $("#statustext").text("Error: must enter a name")
    return
  }

  let numgames = table.rows.length
  let picks = []

  let pickSemi1 = $('radio[name="bowl' + (table.children.length - 3) + '"]').val()
  let i
  for (i = 0; i < numgames; i++) {
    let pick = $('radio[name="bowl' + i + '"]').val()

    if (pick == "") {
      statustext.innerHTML = "Error: all games must be selected"
      return
    }
    picks.push(pick)
  }

  let data = {
    "name": $("#nametext").val(),
    "picks": picks
  }

  $.ajax({
    type: "POST",
    url: api_url,
    dataType: "json",
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"year": yearArg, "gid": gidArg, "data": data}),

    success: function() {
      $("#statustext").text("Success!")
    },

    error: function() {
      $("#statustext").text("Error: submission issue")
    }
  })

}

function changePickOptions() {
  yearArg = $("#yearsel").val()
  gidArg = $("#gamesel").val()

  populatePickOptions(yearArg, gidArg)
}
