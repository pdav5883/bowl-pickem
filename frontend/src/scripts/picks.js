import { API_URL, NEXT_GAME, PREV_GAME } from "./constants.js";
import { populateMenu, populateGameList, populateYears } from "./shared.js";

import { initButtons, spinnerOn, spinnerOff } from "blr-shared-frontend";

import $ from "jquery";

// need to have keep these at global scope since year/gid
// needed by submitPicks, even when they come in as args
// also keep track of game type currently loaded
let yearArg;
let gidArg;
let hasArgs;
let gameType;
let firstPlayoff;

$(function () {
  populateMenu();
  initButtons(["joinbutton", "scorebutton", "subbutton1", "subbutton2"]);

  $("#yearsel").on("change", populateGameList);
  $("#subbutton1").on("click", submitPicks);
  $("#subbutton2").on("click", submitPicks);
  $("#joinbutton").on("click", () => {
    yearArg = $("#yearsel").val();
    gidArg = $("#gamesel").val();
    attemptJoinGame(yearArg, gidArg);
  });
  $("#scorebutton").on("click", goToScoreboard);
  $("#remainingform").hide();
  $("#scorebutton").hide();
  initPicksPage();
});

function initPicksPage() {
  // check for args to set year/gameid selects
  const params = new URLSearchParams(window.location.search);

  if (params.has("year") && params.has("gid")) {
    $("#joinform").hide();

    yearArg = params.get("year");
    gidArg = params.get("gid");
    hasArgs = true;
    attemptJoinGame(yearArg, gidArg);
  } else {
    $("#nameform").hide();
    $("#subbutton1").hide();
    $("#subbutton2").hide();
    $("#joinbutton").show();
    $("#picktitle").text("Select a Game");

    hasArgs = false;

    populateYears(true); // also populates games
  }
}

function attemptJoinGame(year, gid) {
  $("#remainingform").hide();
  $("#scorebutton").hide(); // need this if you already submitted picks
  $("statustext").text("");

  $("#picktitle").text("");

  // clear the table
  let table = document.getElementById("picktable");
  table.innerHTML = "";

  spinnerOn("joinbutton");

  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: { qtype: "scoreboard", year: year, gid: gid },
    crossDomain: true,
    success: function (game) {
      $("#statustext").text("");
      spinnerOff("joinbutton");

      if (game.lock_picks) {
        $("#picktitle").text("Select a Game");
        $("#statustext").text("Picks are locked for this game!");
        return;
      }

      $("#picktitle").text(
        gid.replace(/-/g, " ") + " " + year + "-" + (parseInt(year) + 1)
      );
      $("#nameform").show();

      $("#joinform").hide();
      $("#scorebutton").hide();
      $("#subbutton1").show();
      $("#subbutton2").show();

      populatePickOptions(game);
    },
    error: function (xhr) {
      let errorMessage = "Error: submission issue";
      if (xhr.responseText) {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage = errorResponse.message || errorMessage;
        } catch (e) {
          errorMessage = xhr.responseText;
        }
      }
      spinnerOff("joinbutton");
      $("#picktitle").text("Select a Game");
      $("#statustext").text(errorMessage);
    },
  });
}

function populatePickOptions(game) {
  gameType = game.type; // store this to know whether to submit advanced or basic

  const table = document.getElementById("picktable");
  table.classList.add("text-center");
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);

  // set this for all downstream functions that need it
  firstPlayoff = game.bowls.length - PREV_GAME[game.year].length;

  game.bowls.forEach((bowl, i) => {
    const row = createBowlRow(bowl, i, game);
    tbody.appendChild(row);
  });

  if (game.type == "advanced") {
    $("#remainingform").show();
    updateCategories();
  }
}

function createBowlRow(bowl, bowlIndex, game) {
  const row = document.createElement("tr");
  const bowlCell = createBowlInfoCell(bowl, bowlIndex, game);
  row.appendChild(bowlCell);

  createPickMatchup(bowl, bowlIndex, game).forEach((cell) =>
    row.appendChild(cell)
  );

  return row;
}

function createBowlInfoCell(bowl, bowlIndex, game) {
  const cell = document.createElement("td");
  cell.classList.add("px-2", "px-lg-3");

  const bowlName = document.createElement("span");
  bowlName.textContent = bowl.name;
  if (bowl.bonus > 0) {
    bowlName.textContent += " [+" + bowl.bonus + "]";
  }
  bowlName.setAttribute("class", "fw-bold bowl-name");
  cell.appendChild(bowlName);
  cell.innerHTML += "<BR>";

  // Teams
  const { team0Span, team1Span } = createTeamSpans(bowl, bowlIndex, game);
  cell.appendChild(team0Span);

  const vsSeparator = document.createElement("span");
  vsSeparator.classList.add("vs-separator");
  vsSeparator.textContent = " vs ";
  cell.appendChild(vsSeparator);

  cell.appendChild(team1Span);
  cell.innerHTML += "<BR>";

  // Date
  const dateSpan = document.createElement("span");
  dateSpan.textContent = bowl.date.join("/");
  dateSpan.classList.add("small");
  cell.appendChild(dateSpan);

  return cell;
}

function createTeamSpans(bowl, bowlIndex, game) {
  const team0Span = document.createElement("span");
  const team1Span = document.createElement("span");
  team0Span.classList.add("small");
  team1Span.classList.add("small");

  const isPlayoff = bowlIndex >= firstPlayoff;

  if (!isPlayoff) {
    team0Span.textContent = bowl.teams[0];
    team1Span.textContent = bowl.teams[1];
  } else {
    const [relPrev0, relPrev1] = PREV_GAME[game.year][bowlIndex - firstPlayoff];
    const prev0 = relPrev0 !== null ? relPrev0 + firstPlayoff : null;
    const prev1 = relPrev1 !== null ? relPrev1 + firstPlayoff : null;

    team0Span.textContent = getPlayoffTeamName(bowl, prev0, game, 0);
    team1Span.textContent = getPlayoffTeamName(bowl, prev1, game, 1);
  }

  return { team0Span, team1Span };
}

function getPlayoffTeamName(
  bowl,
  prevGameIndex,
  game,
  teamSlot,
  isShort = false
) {
  if (prevGameIndex === null) {
    return isShort ? bowl.teams_short[teamSlot] : bowl.teams[teamSlot];
  }

  const prevGame = game.bowls[prevGameIndex];
  const prevPick = $(
    'input[name="bowl' + toString(prevGameIndex) + '"]:checked'
  ).val();
  if (prevPick !== undefined) {
    return isShort ? prevGame.teams_short[prevPick] : prevGame.teams[prevPick];
  } else {
    return "?";
  }
}

function createPickMatchup(bowl, bowlIndex, game) {
  const cell0 = document.createElement("td");
  const name0 = document.createElement("span");
  name0.textContent = bowl.teams_short[0];
  cell0.appendChild(name0);
  cell0.innerHTML += "<BR>";
  const radio0 = document.createElement("input");
  radio0.setAttribute("type", "radio");
  radio0.setAttribute("name", "bowl" + bowlIndex);
  radio0.setAttribute("value", 0);

  if (bowlIndex >= firstPlayoff) {
    radio0.addEventListener("change", () => {
      if (radio0.checked) {
        updateBracket(game);
      }
    });
  }

  cell0.appendChild(radio0);
  cell0.addEventListener("click", () => {
    radio0.checked = true;
  });

  const cell1 = document.createElement("td");
  const name1 = document.createElement("span");
  name1.textContent = bowl.teams_short[1];
  cell1.appendChild(name1);
  cell1.innerHTML += "<BR>";
  const radio1 = document.createElement("input");
  radio1.setAttribute("type", "radio");
  radio1.setAttribute("name", "bowl" + bowlIndex);
  radio1.setAttribute("value", 1);

  if (bowlIndex >= firstPlayoff) {
    radio1.addEventListener("change", () => {
      if (radio1.checked) {
        updateBracket(game);
      }
    });
  }

  cell1.appendChild(radio1);
  cell1.addEventListener("click", () => {
    radio1.checked = true;
  });

  const cells = [cell0, cell1];

  if (game.type === "advanced") {
    // category pick
    const cell2 = document.createElement("td");
    const dropdown = document.createElement("select");
    dropdown.setAttribute("name", "cat" + bowlIndex);
    dropdown.setAttribute("class", "form-select form-select");
    dropdown.style.width = "60px";
    dropdown.addEventListener("change", updateCategories);
    let opt = document.createElement("option");

    // tournament games  always cat3
    if (bowlIndex >= firstPlayoff) {
      opt.textContent = 3;
      opt.setAttribute("value", 3);
      dropdown.appendChild(opt);
    } else {
      opt.textContent = "-";
      opt.setAttribute("value", "");
      dropdown.appendChild(opt);

      for (let k = 1; k <= 6; k++) {
        opt = document.createElement("option");
        opt.textContent = k;
        opt.setAttribute("value", k);
        dropdown.appendChild(opt);
      }
    }

    cell2.appendChild(dropdown);

    // scratch field
    const cell3 = document.createElement("td");
    const scratch = document.createElement("input");
    scratch.setAttribute("type", "text");
    scratch.setAttribute("class", "form-control form-control-sm");
    scratch.style.width = "80px";

    cell3.appendChild(scratch);

    cells.push(cell2, cell3);
  }

  stylePickCells(cells);

  return cells;
}

function stylePickCells(cells) {
  if (cells.length == 2) {
    cells[0].classList.add("px-3", "px-lg-5", "align-middle");
    cells[1].classList.add("pe-3", "pe-lg-5", "align-middle");
  } else {
    cells[0].classList.add("px-1", "px-lg-3", "align-middle");
    cells[1].classList.add("px-1", "px-lg-3", "align-middle");
    cells[2].classList.add("px-1", "px-lg-3", "align-middle");
    cells[3].classList.add("pe-1", "pe-lg-3", "align-middle");
  }
}

function updateBracketGame(game, bracketIndex) {
  const [nextBracketIndex, nextGameSlot] = NEXT_GAME[yearArg][bracketIndex];

  // final always has null next game
  if (!nextBracketIndex) {
    return;
  }

  const thisBowl = game.bowls[firstPlayoff + bracketIndex];
  const nextBowl = game.bowls[firstPlayoff + nextBracketIndex];
  const bowlPick = $(
    'input[name="bowl' + (firstPlayoff + bracketIndex) + '"]:checked'
  ).val();

  nextBowl.teams[nextGameSlot] =
    bowlPick === undefined ? "?" : thisBowl.teams[bowlPick];
  nextBowl.teams_short[nextGameSlot] =
    bowlPick === undefined ? "?" : thisBowl.teams_short[bowlPick];
}

function updateBracket(game) {
  const bracketGames = NEXT_GAME[yearArg].length;
  for (let i = 0; i < bracketGames; i++) {
    updateBracketGame(game, i);
  }

  for (let i = firstPlayoff; i < game.bowls.length; i++) {
    redrawPickRow(game, i);
  }
}

function redrawPickRow(game, bowlIndex) {
  const row =
    document.getElementById("picktable").children[1].children[bowlIndex];
  const bowl = game.bowls[bowlIndex];

  // update bowl cell long names
  row.children[0].children[2].textContent = bowl.teams[0];
  row.children[0].children[4].textContent = bowl.teams[1];

  // update pick short names
  row.children[1].children[0].textContent = bowl.teams_short[0];
  row.children[2].children[0].textContent = bowl.teams_short[1];
}

function submitPicks() {
  // move to top of page
  window.scroll({ top: 0, left: 0, behavior: "smooth" });

  // make sure that yearArg, gidArg match what is in sel
  if (
    !hasArgs &&
    (yearArg !== $("#yearsel").val() || gidArg !== $("#gamesel").val())
  ) {
    $("#statustext").text(
      "Error: year/game dropdowns do not match picks table"
    );
    return;
  }

  let table = document.getElementById("picktable");

  $("#statustext").text("Submitting picks...");

  if ($("#nametext").val() === "") {
    $("#statustext").text("Error: must enter a name");
    return;
  }

  let numgames = table.rows.length;
  let picks = [];
  let categories = [];

  if (gameType === "advanced") {
    if (!updateCategories()) {
      $("#statustext").text("Error: check categories remaining");
      return;
    }
  }

  for (let i = 0; i < numgames; i++) {
    let pick = $('input[name="bowl' + i + '"]:checked').val();

    if (pick === undefined) {
      $("#statustext").text("Error: all games must be selected");
      return;
    }
    picks.push(pick);

    if (gameType === "advanced") {
      let category = $('select[name="cat' + i + '"]').val();

      if (category === "") {
        $("#statustext").text("Error: all games must have category");
        return;
      }
      categories.push(category);
    }
  }

  let data = {
    name: $("#nametext").val(),
    picks: picks,
  };

  if (gameType === "advanced") {
    data["categories"] = categories;
  }

  spinnerOn("subbutton1");
  spinnerOn("subbutton2");

  $.ajax({
    type: "POST",
    url: API_URL.primary,
    dataType: "json",
    crossDomain: true,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify({ year: yearArg, gid: gidArg, data: data }),

    success: function () {
      $("#statustext").text("Success!");
      $("#scorebutton").show();
      spinnerOff("subbutton1");
      spinnerOff("subbutton2");
      $("#joinform").show();
      $("#nameform").hide();
      $("#subbutton1").hide();
      $("#subbutton2").hide();
    },

    error: function (xhr) {
      let errorMessage = "Error: submission issue";
      if (xhr.responseText) {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage = errorResponse.message || errorMessage;
        } catch (e) {
          errorMessage = xhr.responseText;
        }
      }
      spinnerOff("subbutton1");
      spinnerOff("subbutton2");
      $("#statustext").text(errorMessage);
      $("#scorebutton").hide();
    },
  });
}

function updateCategories() {
  // returns true if categories have correct number of picks

  let remlist = document.getElementById("remaininglist");
  let numGames = document.getElementById("picktable").rows.length;

  // start remaining with the total allowed, then decrement based on picks
  let catRemaining = Array(6).fill(Math.floor((numGames - 11) / 6));

  for (let i = 0; i < (numGames - 11) % 6; i++) {
    catRemaining[i]++;
  }
  catRemaining[2] += 11; // the eleven CFP games

  // search for all select names beginning with cat, count categories
  $("select[name^=cat]").each(function () {
    let val = $(this).val();

    if (val !== "") {
      catRemaining[parseInt(val) - 1]--;
    }
  });

  // populate categories remaining text
  Array.from(remlist.children).forEach(
    (rem, i) => (rem.children[0].textContent = catRemaining[i])
  );

  // return true if all categories remaining are zero
  return catRemaining.every((item) => item === 0);
}

function goToScoreboard() {
  window.location.href = "/?year=" + yearArg + "&gid=" + gidArg;
}

// // need gid as arg to know if it's advanced
// function populatePickOptions_OLD(game){
//   let table = document.getElementById("picktable")
//   if (game.type == "advanced") {
//     $("#remainingform").show()
//   }

//   game.bowls.forEach((bowl, i) => {
//     let row = document.createElement("tr")
//     let cell = document.createElement("th")

//     // name of bowl
//     let spanBowl = document.createElement("span")
//     spanBowl.textContent = bowl.name

//     if (bowl.bonus > 0) {
//       spanBowl.textContent += " [+" + bowl.bonus + "]"
//     }

//     spanBowl.setAttribute("class", "fw-bold")
//     cell.appendChild(spanBowl)
//     cell.innerHTML += "<BR>"

//     let aTeam0
//     let aTeam1

//     // teams in bowl
//     if (bowl.hasOwnProperty("links")) {
//       aTeam0 = document.createElement("a")
//       aTeam1 = document.createElement("a")
//       aTeam0.href = bowl.links[0]
//       aTeam1.href = bowl.links[1]
//       aTeam0.target = "_blank"
//       aTeam1.target = "_blank"
//       aTeam0.rel = "noopener noreferrer"
//       aTeam1.rel = "noopener noreferrer"
//     }

//     else {
//       aTeam0 = document.createElement("span")
//       aTeam1 = document.createElement("span")
//     }

//     aTeam0.textContent = bowl.teams[0]
//     aTeam1.textContent = bowl.teams[1]

//     if (i == game.bowls.length - 1) {
//       aTeam0.textContent = "?"
//       aTeam1.textContent = "?"
//     }

//     cell.appendChild(aTeam0)
//     cell.innerHTML += " vs "
//     cell.appendChild(aTeam1)
//     cell.innerHTML += "<BR>"

//     // date of bowl
//     let spanDate = document.createElement("span")
//     spanDate.textContent = bowl.date[0].toString() + "/" + bowl.date[1].toString() + "/" + bowl.date[2].toString()
//     spanDate.setAttribute("class", "small")
//     cell.appendChild(spanDate)

//     row.appendChild(cell)

//     // pick options, with logic for CFP
//     cell = document.createElement("td")
//     let shortName = bowl.teams_short[0]

//     if (i == game.bowls.length - 1) {
//       shortName = "?"
//     }

//     let nameSpan = document.createElement("span")
//     nameSpan.textContent = shortName
//     cell.appendChild(nameSpan)
//     cell.innerHTML += "<BR>"
//     let radio = document.createElement("input")
//     radio.setAttribute("type", "radio")
//     radio.setAttribute("name", "bowl" + i)
//     radio.setAttribute("value", 0)

//     if (i >= game.bowls.length - NEXT_GAME[yearArg].length) {
//       radio.addEventListener("change", updateBracket)
//     }

//     cell.appendChild(radio)
//     row.appendChild(cell)

//     cell = document.createElement("td")
//     shortName = bowl.teams_short[1]

//     if (i == game.bowls.length - 1) {
//       shortName = "?"
//     }

//     nameSpan = document.createElement("span")
//     nameSpan.textContent = shortName
//     cell.appendChild(nameSpan)
//     cell.innerHTML += "<BR>"
//     radio = document.createElement("input")
//     radio.setAttribute("type", "radio")
//     radio.setAttribute("name", "bowl" + i)
//     radio.setAttribute("value", 1)

//     if (i >= game.bowls.length - NEXT_GAME[yearArg].length) {
//       radio.addEventListener("change", updateBracket)
//     }

//     cell.appendChild(radio)
//     row.appendChild(cell)

//     if (gameType === "advanced") {
//       // category pick
//       cell = document.createElement("td")
//       let dropdown = document.createElement("select")
//       dropdown.setAttribute("name", "cat" + i)
//       dropdown.setAttribute("class", "form-select form-select-sm")
//       dropdown.addEventListener("change", updateCategories)
//       let opt = document.createElement("option")

//       // tournament games  always cat3
//       if (i >= game.bowls.length - NEXT_GAME[yearArg].length) {
//         opt.textContent = 3
//         opt.setAttribute("value", 3)
//         dropdown.appendChild(opt)
//       }

//       else {
//         opt.textContent = "-"
//         opt.setAttribute("value", "")
//         dropdown.appendChild(opt)

//         for (let k = 1; k <=6; k++) {
//           opt = document.createElement("option")
//           opt.textContent = k
//           opt.setAttribute("value", k)
//           dropdown.appendChild(opt)
//         }
//       }

//       cell.appendChild(dropdown)
//       row.appendChild(cell)

//       // scratch field
//       cell = document.createElement("td")
//       let scratch = document.createElement("input")
//       scratch.setAttribute("type", "text")
//       scratch.setAttribute("class", "form-control form-control-sm")
//       scratch.style.width = "100px"

//       cell.appendChild(scratch)
//       row.appendChild(cell)
//     }
//     table.appendChild(row)
//   })

//   if (gameType === "advanced") {
//     updateCategories()
//   }
// }
