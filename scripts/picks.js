window.onload = populateForm

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
    url: "https://nstpyzzfae.execute-api.us-east-1.amazonaws.com/pickem",
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

function populateForm(){
    $.getJSON( "/data/data.json", function( data ) {
      // read each game
      // two new radio inputs for each
      var table = document.getElementById("picktable")
      
      // row for each game
      var row = null
      var cell = null
      var game = null
      
      for (var i = 0; i < data.games.length; i++) {
	game = data.games[i]
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
    })
}
