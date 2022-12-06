let api_url = "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem"

window.onload = initPopulateForm

function submitForm() {
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
  var pick = null

  for (var i = 0; i < numgames; i++) {
    pick = form.elements["game" + i].value

    if (pick == "") {
      statustext.innerHTML = "Error: all games must be selected"
      return
    }
    picks.push(pick)
  }

  var data = {
    "name": name,
    "picks": picks
  }

  $.ajax({
    type: "POST",
    url: api_url,
    dataType: "json",
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data),

    success: function() {
      statustext.innerHTML = "Success!"
      form.reset()
    },

    error: function() {
      statustext.innerHTML = "Error: submission issue"
    }
  })

}

function initPopulateForm() {
  populateForm(0)
  getHistoricalYears()
}

function changeYear() {
  var year = document.getElementById("yearsel").value
  populateForm(year)
  scroll(0, 0)
}

function populateForm(year){
  $.ajax({
    method: "GET",
    url: api_url,
    data: {"qtype": "games", "year": year},
    crossDomain: true,
    success: function( games ) {
      // title of page
      if (year == 0) {
	var titlestr = "Current Pick'Em"
      }
      else {
	var titlestr = "Pick'Em " + year + "-" + (parseInt(year) + 1)
      }
      document.getElementById("picktitle").innerHTML = titlestr

      var table = document.getElementById("picktable")

      // clear the table
      table.innerHTML = ""
      
      // row for each game
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
	span_bowl.setAttribute("class", "bowl-span")
	cell.appendChild(span_bowl)
	cell.innerHTML += "<BR>"
	// teams in bowl
	cell.innerHTML += game.teams[0] + " vs " + game.teams[1]
	cell.innerHTML += "<BR>"
	
	// date of bowl
	var span_date = document.createElement("span")
	span_date.innerHTML = game.date[0].toString() + "/" + game.date[1].toString() + "/" + game.date[2].toString()
	span_date.setAttribute("class", "date-span")
	cell.appendChild(span_date)

	row.appendChild(cell)

	// pick options
	cell = document.createElement("td")
	cell.innerHTML = game.teams_short[0] + "<BR>"
	var radio = document.createElement("input")
	radio.setAttribute("type", "radio")
	radio.setAttribute("name", "game" + i)
	radio.setAttribute("value", 0)
	cell.appendChild(radio)
	row.appendChild(cell)

	cell = document.createElement("td")
	cell.innerHTML = game.teams_short[1] + "<BR>"
	var radio = document.createElement("input")
	radio.setAttribute("type", "radio")
	radio.setAttribute("name", "game" + i)
	radio.setAttribute("value", 1)
	cell.appendChild(radio)
	row.appendChild(cell)
        
	table.appendChild(row)
      }
    }
  })
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
