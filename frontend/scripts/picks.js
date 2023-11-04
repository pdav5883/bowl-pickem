const api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"

// need to have keep these at global scope since year/gid
// needed by submitPicks, even when they come in as args
// also keep track of game type currently loaded
let yearArg
let gidArg
let gameType

$(document).ready(function() {
  $("#yearsel").on("change", populateGameList)
  $("#subbutton1").on("click", submitPicks)
  $("#subbutton2").on("click", submitPicks)
  $("#gobutton").on("click", changePickOptions)
  $("#remaininglist").hide()
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
    $("#gobutton").hide()

    yearArg = params.get("year")
    gidArg = params.get("gid")
    
    populatePickOptions(yearArg, gidArg)
  }
  
  else {
    $("#nametext").hide()
    $("#namelab").hide()
    $("#subbutton1").hide()
    $("#subbutton2").hide()
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
  $("#nametext").show()
  $("#namelab").show()
  $("#subbutton1").show()
  $("#subbutton2").show()
  
  $.ajax({
    method: "GET",
    url: api_url,
    data: {"qtype": "scoreboard", "year": year, "gid": gid},
    crossDomain: true,
    success: function(game) {
      $("#statustext").text("")
      $("#remaininglist").hide() // doing here to cover case with lock picks

      // set global variables
      gameType = game.type

      // title of page
      let title = document.getElementById("picktitle")
      title.textContent = gid.replace("-", " ") + " "
      
      let yearspan = document.createElement("span")
      yearspan.textContent = year + "-" + (parseInt(year) + 1)
      yearspan.setAttribute("class", "nowrap")
      title.appendChild(yearspan)

      // clear the table
      let table = document.getElementById("picktable")
      table.innerHTML = ""

      if (game.lock_picks) {
	$("#statustext").text("Picks are locked for this game")
	return
      }

      if (gameType == "advanced") {
	$("#remaininglist").show()
      }
      
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
	
	if (gameType === "advanced") {
	  // category pick
	  cell = document.createElement("td")
	  let dropdown = document.createElement("select")
	  dropdown.setAttribute("name", "cat" + i)
	  dropdown.setAttribute("class", "cat-select")
	  dropdown.addEventListener("change", updateCategories)
	  
	  let opt = document.createElement("option")

	  // semis and final are always cat3
	  if (i >= game.bowls.length - 3) {
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
	  scratch.setAttribute("class", "scratch-text")
	  
	  cell.appendChild(scratch)
	  row.appendChild(cell) 
	}
	table.appendChild(row)
      })

      if (gameType === "advanced") {
	updateCategories()
      }
    }
  })
}


function updateBracket() {
  let table = document.getElementById("picktable")
  
  let pickSemi1 = $('input[name="bowl' + (table.children.length - 3) + '"]:checked').val()
  let pickSemi2 = $('input[name="bowl' + (table.children.length - 2) + '"]:checked').val()

  let semi1 = table.children[table.children.length - 3]
  let semi2 = table.children[table.children.length - 2]
  let fina = table.children[table.children.length - 1]

  if (pickSemi1 === undefined) {
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

  
  if (pickSemi2 === undefined) {
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
  let categories = []

  if (gameType === "advanced") {
    if (!updateCategories()) {
      $("#statustext").text("Error: check categories remaining")
      return
    }
  }
      

  for (let i = 0; i < numgames; i++) {
    let pick = $('input[name="bowl' + i + '"]:checked').val()

    if (pick === undefined) {
      $("#statustext").text("Error: all games must be selected")
      return
    }
    picks.push(pick)

    if (gameType === "advanced") {
      let category = $('select[name="cat' + i + '"]').val()

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


function updateCategories() {
  // returns true if categories have correct number of picks
  
  let remlist = document.getElementById("remaininglist")
  let numGames = document.getElementById("picktable").rows.length

  // start remaining with the total allowed, then decrement based on picks
  let catRemaining = Array(6).fill(Math.floor((numGames - 3) / 6))

  for (let i = 0; i < (numGames - 3) % 6; i++) {
    catRemaining[i]++
  }
  catRemaining[2] += 3 // the three CFP games

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
  yearArg = $("#yearsel").val()
  gidArg = $("#gamesel").val()

  populatePickOptions(yearArg, gidArg)
}
