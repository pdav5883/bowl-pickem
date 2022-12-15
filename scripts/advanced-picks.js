let api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"
let current_year = 0

window.onload = initPopulateFormAdv

function submitFormAdv() {
  var statustext = document.getElementById("statustext")
  var form = document.getElementById("pickform")
  var table = document.getElementById("picktable")

  var name = form.elements["name"].value

  if (name == "") {
    statustext.innerHTML = "Error: must enter a name"
    return
  }

  var numgames = table.rows.length
  var picks = []
  var categories = []
  var pick = null
  var category = null

  for (var i = 0; i < numgames; i++) {
    pick = form.elements["game" + i].value
    category = form.elements["cat" + i].value

    if (pick == "" || category == "") {
      statustext.innerHTML = "Error: all games must be selected"
      return
    }
    picks.push(pick)
    categories.push(category)
  }

  var data = {
    "name": name,
    "picks": picks,
    "categories": categories
  }

  $.ajax({
    type: "POST",
    url: api_url,
    dataType: "json",
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({"year": current_year, "data": data}),

    success: function() {
      statustext.innerHTML = "Success!"
      form.reset()
    },

    error: function() {
      statustext.innerHTML = "Error: submission issue"
    }
  })

}

function initPopulateFormAdv() {
  populateFormAdv(0)
  getHistoricalYears()
}

function changeYear() {
  var year = document.getElementById("yearsel").value
  populateFormAdv(year)
  scroll(0, 0)
}

function populateFormAdv(year){
  $.ajax({
    method: "GET",
    url: api_url,
    data: {"qtype": "games", "year": year},
    crossDomain: true,
    success: function( res ) {
      // title of page
      var titlestr = "Super Pick'Em " + res.year + "-" + (parseInt(res.year) + 1)
      document.getElementById("picktitle").innerHTML = titlestr

      // store the year for later submission
      current_year = res.year

      // clear the table
      var table = document.getElementById("picktable")
      table.innerHTML = ""
      
      // row for each game
      var games = res.data
      var row = null
      var cell = null
      var game = null
      
      for (var i = 0; i < games.length; i++) {
	game = games[i]
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
	// teams in bowl
	var span_team0 = document.createElement("span")
	var span_team1 = document.createElement("span")
	span_team0.innerHTML = game.teams[0]
	span_team1.innerHTML = game.teams[1]

	if (i == games.length - 1) {
	  span_team0.innerHTML = "?"
	  span_team1.innerHTML = "?"
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

	// pick options, with logic for CFP
	cell = document.createElement("td")
	var shortname = game.teams_short[0]
	
	if (i == games.length - 1) {
	  shortname = "?"
	}

	var nameSpan = document.createElement("span")
	nameSpan.innerHTML = shortname
	cell.appendChild(nameSpan)
	cell.innerHTML += "<BR>"
	var radio = document.createElement("input")
	radio.setAttribute("type", "radio")
	radio.setAttribute("name", "game" + i)
	radio.setAttribute("value", 0)

	if (i == games.length - 2 || i == games.length - 3) {
	  radio.addEventListener("change", updateBracket)
	}
	
	cell.appendChild(radio)
	row.appendChild(cell)

	cell = document.createElement("td")
	shortname = game.teams_short[1]

	if (i == games.length - 1) {
	  shortname = "?"
	}

	nameSpan = document.createElement("span")
	nameSpan.innerHTML = shortname
	cell.appendChild(nameSpan)
	cell.innerHTML += "<BR>"
	radio = document.createElement("input")
	radio.setAttribute("type", "radio")
	radio.setAttribute("name", "game" + i)
	radio.setAttribute("value", 1)
	
	if (i == games.length - 2 || i == games.length - 3) {
	  radio.addEventListener("change", updateBracket)
	}
	
	cell.appendChild(radio)
	row.appendChild(cell)

	// category pick
	cell = document.createElement("td")
	var dropdown = document.createElement("select")
	dropdown.setAttribute("name", "cat" + i)
	dropdown.setAttribute("class", "cat-select")
	dropdown.addEventListener("change", updateCategories)
	
	var opt = document.createElement("option")

	// semis and final are always cat3
	if (i >= games.length - 3) {
	  opt.innerHTML = 3
	  opt.setAttribute("value", 3)
	  dropdown.appendChild(opt)
	}
	else {
	  opt.innerHTML = "-"
	  opt.setAttribute("value", "")
	  dropdown.appendChild(opt)

	  for (var k = 1; k <=6; k++) {
	    opt = document.createElement("option")
	    opt.innerHTML = k
	    opt.setAttribute("value", k)
	    dropdown.appendChild(opt)
	  }
	}

	cell.appendChild(dropdown)
	row.appendChild(cell)

	// scratch field
	cell = document.createElement("td")
	var scratch = document.createElement("input")
	scratch.setAttribute("type", "text")
	scratch.setAttribute("class", "scratch-text")
	
	cell.appendChild(scratch)
	row.appendChild(cell)
        
	table.appendChild(row)
      }
    }
  })
}

function updateBracket() {
  var form = document.getElementById("pickform")
  var table = document.getElementById("picktable")
  
  var picksemi1 = form.elements["game" + (table.children.length - 3)].value
  var picksemi2 = form.elements["game" + (table.children.length - 2)].value

  var semi1 = table.children[table.children.length - 3]
  var semi2 = table.children[table.children.length - 2]
  var fina = table.children[table.children.length - 1]

  if (picksemi1 == "") {
    fina.children[0].children[2].innerHTML = "?"
    fina.children[1].children[0].innerHTML = "?"
  }
  else if (picksemi1 == 0) {
    fina.children[0].children[2].innerHTML = semi1.children[0].children[2].innerHTML
    fina.children[1].children[0].innerHTML = semi1.children[1].children[0].innerHTML
  }
  else if (picksemi1 == 1) {
    fina.children[0].children[2].innerHTML = semi1.children[0].children[3].innerHTML
    fina.children[1].children[0].innerHTML = semi1.children[2].children[0].innerHTML
  }

  
  if (picksemi2 == "") {
    fina.children[0].children[3].innerHTML = "?"
    fina.children[2].children[0].innerHTML = "?"
  }
  else if (picksemi2 == 0) {
    fina.children[0].children[3].innerHTML = semi2.children[0].children[2].innerHTML
    fina.children[2].children[0].innerHTML = semi2.children[1].children[0].innerHTML
  }
  else if (picksemi2 == 1) {
    fina.children[0].children[3].innerHTML = semi2.children[0].children[3].innerHTML
    fina.children[2].children[0].innerHTML = semi2.children[2].children[0].innerHTML
  }
}


function updateCategories() {
  return true
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
