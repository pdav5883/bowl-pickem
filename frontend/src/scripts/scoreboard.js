import { API_URL, PREV_GAME } from "./constants.js";
import { populateMenu } from "./shared.js";
import $ from "jquery";

import { initButtons, spinnerOn, spinnerOff } from "blr-shared-frontend";

let currentGame;
let currentScores;

$(function () {
  $("#nextntableshowhidebutton").hide();
  $("#playofftableshowhidebutton").hide();
  $("#scoretableshowhidebutton").hide();

  populateMenu();
  initButtons(["gobutton"]);

  $("#yearsel").on("change", populateGameList);
  $("#gobutton").on("click", () => {
    populateGame();
  });
  $("#editbutton").on("click", () => {
    editMode();
    populateYears(true);
  });
  $("#showBestFinish").on("change", () => {
    populateLeaderboard(currentGame, currentScores, $(this).is(":checked"));
  });

  const tablelist = ["nextntable", "playofftable", "scoretable"];
  tablelist.forEach((table) => {
    $("#" + table + "showhidebutton").on("click", () => {
      if ($("#" + table + "showhidebutton").hasClass("collapsed")) {
        $("#" + table + "showhidetext").text("Show");
      } else {
        $("#" + table + "showhidetext").text("Hide");
      }
    });
  });

  initScoreboardPage();
});

function initScoreboardPage() {
  const params = new URLSearchParams(window.location.search);

  // Check URL params first, then localStorage
  if (params.has("year") && params.has("gid")) {
    displayMode();
    populateGame({ year: params.get("year"), gid: params.get("gid") });
  } else if (
    localStorage.getItem("year") !== null &&
    localStorage.getItem("gid") !== null
  ) {
    displayMode();
    populateGame({
      year: localStorage.getItem("year"),
      gid: localStorage.getItem("gid"),
    });
  } else {
    editMode();
    populateYears(true);
  }

  $("#bestFinishForm").hide();
  addBestFinishPopup();
}

function editMode() {
  $("#editbutton").hide();
  $("#goform").show();
}

function displayMode() {
  $("#editbutton").show();
  $("#goform").hide();
}

function populateYears(defaultLatest) {
  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: { qtype: "years" },
    crossDomain: true,
    success: function (years) {
      let yearOpt;

      years.forEach((year) => {
        yearOpt = document.createElement("option");
        yearOpt.value = year;
        yearOpt.textContent = year;
        $("#yearsel").append(yearOpt);
      });

      if (defaultLatest) {
        $("#yearsel").val(yearOpt.value).change();
      }
    },
  });
}

function populateGameList() {
  $("#gamesel").empty();

  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: { qtype: "games", year: $("#yearsel").val() },
    crossDomain: true,
    success: function (res) {
      Object.keys(res).forEach((gid) => {
        const game = document.createElement("option");
        game.value = gid;
        game.textContent = gid.replace(/-/g, " ");
        $("#gamesel").append(game);
      });
    },
  });
}

function populateGame(args) {
  const year = args === undefined ? $("#yearsel").val() : args.year;
  const gid = args === undefined ? $("#gamesel").val() : args.gid;

  spinnerOn("gobutton");

  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: { qtype: "scoreboard", year: year, gid: gid },
    crossDomain: true,
    success: function (game) {
      currentGame = game;

      updateTitle(gid, year);
      localStorage.setItem("year", year);
      localStorage.setItem("gid", gid);

      const renderNames = getRenderNames(
        game.players.map((player) => player.name)
      );
      game.players.forEach((player, i) => (player.renderName = renderNames[i]));

      const scores = populateScoreboard(game, "scoretable");
      currentScores = scores;
      populateLeaderboard(game, scores, $("#showBestFinish").is(":checked"));

      populateScoreboard(game, "nextntable", currentScores, false, 3, 3);
      populateScoreboard(game, "playofftable", currentScores, true);

      $("#nextntableshowhidebutton").show();
      $("#playofftableshowhidebutton").show();
      $("#scoretableshowhidebutton").show();

      $("#nextntableshowhidebutton").trigger("click");
      spinnerOff("gobutton");
    },
    error: function (err) {
      spinnerOff("gobutton");
    },
  });
}

function updateTitle(gid, year) {
  const title = document.getElementById("scoretitle");
  title.textContent = gid.replace(/-/g, " ") + " ";

  const yearspan = document.createElement("span");
  yearspan.textContent = year + "-" + (parseInt(year) + 1);
  yearspan.setAttribute("class", "text-nowrap");
  title.appendChild(yearspan);
}

// =================================
// SCOREBOARD RENDERING
// =================================

// prevN, nextN, playoffs are optional args to only show the previous N games or the next N games (no playoffs)
function populateScoreboard(
  game,
  tableName,
  scores,
  playoffOnly,
  prevN,
  nextN
) {
  const table = document.getElementById(tableName);
  table.classList.add("text-center");
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);

  createHeaderRow(thead, game.players);

  const firstPlayoff = game.bowls.length - PREV_GAME[game.year].length;
  let bowlIndices = [];

  if (playoffOnly === true) {
    for (let j = firstPlayoff; j < game.bowls.length; j++) {
      bowlIndices.push(j);
    }
  } else if (prevN !== undefined && nextN !== undefined) {
    // assume that non-playoff bowls are sorted datetime-wise

    // find the first game happening today or after today
    const today = new Date();
    let i;
    for (i = 0; i < firstPlayoff; i++) {
      const deltaDay =
        366 * (game.bowls[i].date[2] - (today.getFullYear() % 100)) +
        31 * (game.bowls[i].date[0] - today.getMonth() - 1) +
        1 * (game.bowls[i].date[1] - today.getDate()) +
        (1 / 24) * (Math.floor(game.bowls[i].time / 100) - today.getHours()) +
        (1 / 1440) * ((game.bowls[i].time % 100) - today.getMinutes());
      if (deltaDay >= 0) {
        break;
      }
    }

    const firstInd = Math.max(0, i - prevN);
    const lastInd = Math.min(firstPlayoff, i + nextN);

    for (let j = firstInd; j < lastInd; j++) {
      bowlIndices.push(j);
    }
  } else {
    bowlIndices = Array.from({ length: game.bowls.length }, (_, i) => i);
  }

  bowlIndices.forEach((i) => {
    const row = createBowlRow(game.bowls[i], i, game, firstPlayoff);
    tbody.appendChild(row);
  });

  insertSpacedHeaderRows(tbody, table);

  if (scores === undefined) {
    scores = calcScores(game);
  }

  createScoreRow(thead, scores);
  equalizeColumnWidths();

  if (game.calc_margin) {
    $("#bestFinishForm").show();
  } else {
    $("#bestFinishForm").hide();
  }

  return scores;
}

function createHeaderRow(thead, players) {
  const row = document.createElement("tr");
  const cell = document.createElement("th");
  cell.textContent = "";
  cell.classList.add("px-2", "no-border");
  row.appendChild(cell);

  players.forEach((player) => {
    const playerCell = document.createElement("th");
    playerCell.textContent = player.renderName;
    row.appendChild(playerCell);

    // Initialize tracking arrays for playoffs
    player.short_winner = [];
    player.game_correct = [];
  });

  thead.appendChild(row);
}

function createBowlRow(bowl, bowlIndex, game, firstPlayoff) {
  const row = document.createElement("tr");
  const bowlCell = createBowlInfoCell(bowl, bowlIndex, game, firstPlayoff);
  row.appendChild(bowlCell);

  game.players.forEach((player) => {
    const pickCell = createPickCell(
      bowl,
      bowlIndex,
      player,
      game,
      firstPlayoff
    );
    row.appendChild(pickCell);
  });

  return row;
}

function createBowlInfoCell(bowl, bowlIndex, game, firstPlayoff) {
  const cell = document.createElement("td");
  cell.classList.add("px-2");

  // Bowl name with bonus
  const bowlName = document.createElement("span");
  bowlName.textContent = bowl.name;
  if (bowl.bonus > 0) {
    bowlName.textContent += " [+" + bowl.bonus + "]";
  }
  bowlName.setAttribute("class", "fw-bold bowl-name");
  cell.appendChild(bowlName);
  cell.innerHTML += "<BR>";

  // Teams
  const { team0Span, team1Span } = createTeamSpans(
    bowl,
    bowlIndex,
    game,
    firstPlayoff
  );
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

function createTeamSpans(bowl, bowlIndex, game, firstPlayoff) {
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

  // Underline winner
  if (bowl.result === 0) {
    team0Span.classList.add("text-decoration-underline", "fw-bold");
  } else if (bowl.result === 1) {
    team1Span.classList.add("text-decoration-underline", "fw-bold");
  }

  return { team0Span, team1Span };
}

function getPlayoffTeamName(bowl, prevGameIndex, game, teamSlot) {
  if (prevGameIndex === null) {
    return bowl.teams[teamSlot];
  }

  const prevGame = game.bowls[prevGameIndex];
  if (prevGame.result !== null) {
    const teamName = prevGame.teams[prevGame.result];
    bowl.teams[teamSlot] = teamName;
    return teamName;
  }

  return "?";
}

/**
 * Creates a table cell for a player's pick in a bowl game.
 * @param {Object} bowl - The bowl game data.
 * @param {number} bowlIndex - The index of the bowl game.
 * @param {Object} player - The player data.
 * @param {Object} game - The game configuration.
 * @param {number} firstPlayoff - The index of the first playoff bowl game.
 * @returns {HTMLTableCellElement} The created table cell.
 */
function createPickCell(bowl, bowlIndex, player, game, firstPlayoff) {
  const cell = document.createElement("td");
  cell.classList.add("align-middle");

  const isPlayoff = bowlIndex >= firstPlayoff;

  if (player.picks[bowlIndex] === null) {
    cell.textContent = "?";
  } else if (!isPlayoff) {
    cell.textContent = bowl.teams_short[player.picks[bowlIndex]];
    if (game.type === "advanced") {
      cell.textContent += " - " + player.categories[bowlIndex];
    }
  } else {
    handlePlayoffPick(cell, bowl, bowlIndex, player, game, firstPlayoff);
  }

  stylePickCell(cell, bowl, bowlIndex, player, isPlayoff, game, firstPlayoff);

  return cell;
}

function handlePlayoffPick(cell, bowl, bowlIndex, player, game, firstPlayoff) {
  const [relPrev0, relPrev1] = PREV_GAME[game.year][bowlIndex - firstPlayoff];
  const prev0 = relPrev0 !== null ? relPrev0 + firstPlayoff : null;
  const prev1 = relPrev1 !== null ? relPrev1 + firstPlayoff : null;
  const prevGames = [prev0, prev1];
  const pickIndex = player.picks[bowlIndex];
  const prevGame = prevGames[pickIndex];

  if (prevGame === null) {
    cell.textContent = bowl.teams_short[pickIndex];
    player.short_winner.push(bowl.teams_short[pickIndex]);
  } else {
    cell.textContent = player.short_winner[prevGame - firstPlayoff];
    player.short_winner.push(player.short_winner[prevGame - firstPlayoff]);
  }

  if (game.type === "advanced") {
    cell.textContent += " - " + player.categories[bowlIndex];
  }
}

/**
 * Styles a player's pick cell based on whether the pick was correct or incorrect.
 * @param {HTMLTableCellElement} cell - The table cell to style.
 * @param {Object} bowl - The bowl game data.
 * @param {number} bowlIndex - The index of the bowl game.
 * @param {Object} player - The player data.
 * @param {boolean} isPlayoff - Whether the bowl game is a playoff game.
 * @param {Object} game - The game configuration.
 * @param {number} firstPlayoff - The index of the first playoff bowl game.
 */
function stylePickCell(
  cell,
  bowl,
  bowlIndex,
  player,
  isPlayoff,
  game,
  firstPlayoff
) {
  if (!isPlayoff) {
    if (bowl.result !== null && player.picks[bowlIndex] !== null) {
      if (bowl.result === player.picks[bowlIndex]) {
        cell.classList.add("table-success");
      } else {
        cell.classList.add("table-danger");
      }
    }
  } else {
    stylePlayoffPickCell(cell, bowl, bowlIndex, player, game, firstPlayoff);
  }
}

/**
 * Styles a player's playoff pick cell based on the correctness of the pick and its parent game.
 * @param {HTMLTableCellElement} cell - The table cell to style.
 * @param {Object} bowl - The bowl game data.
 * @param {number} bowlIndex - The index of the bowl game.
 * @param {Object} player - The player data.
 * @param {Object} game - The game configuration.
 * @param {number} firstPlayoff - The index of the first playoff bowl game.
 */
function stylePlayoffPickCell(
  cell,
  bowl,
  bowlIndex,
  player,
  game,
  firstPlayoff
) {
  const pickIndex = player.picks[bowlIndex];

  if (pickIndex === null) {
    return;
  }

  const [relPrev0, relPrev1] = PREV_GAME[game.year][bowlIndex - firstPlayoff];
  const prev0 = relPrev0 !== null ? relPrev0 + firstPlayoff : null;
  const prev1 = relPrev1 !== null ? relPrev1 + firstPlayoff : null;
  const prevGames = [prev0, prev1];
  const prevGame = prevGames[pickIndex];

  // Parent game is wrong
  if (player.game_correct[prevGame - firstPlayoff] === false) {
    cell.classList.add("table-danger");
    player.game_correct.push(false);
  }
  // Parent game correct, this game not played yet
  else if (bowl.result === null) {
    player.game_correct.push(null);
  }
  // Parent game correct, this game correct
  else if (bowl.result === pickIndex) {
    cell.classList.add("table-success");
    playe;
  }
  // Parent game correct, this game wrong
  else {
    cell.classList.add("table-danger");
    player.game_correct.push(false);
  }
}

function insertSpacedHeaderRows(tbody, table) {
  const nameRow = table.children[0];
  const breakRows = [];

  for (let i = 8; i < table.children.length; i += 6) {
    breakRows.push(table.children[i]);
  }

  breakRows.forEach((br) => {
    tbody.insertBefore(nameRow.cloneNode(true), br);
  });
}

function createScoreRow(thead, scores) {
  const row = document.createElement("tr");
  const emptyCell = document.createElement("td");
  emptyCell.classList.add("fs-5", "px-2");
  row.appendChild(emptyCell);

  scores.forEach((score) => {
    const cell = document.createElement("td");
    cell.textContent = score;
    cell.classList.add("table-secondary", "fw-bold", "fs-5");
    row.appendChild(cell);
  });

  thead.appendChild(row);
}

function equalizeColumnWidths() {
  const table = document.getElementById("scoretable");
  const rows = table.querySelectorAll("tr");

  if (rows.length === 0) return;

  const firstRow = rows[0];
  const nonFirstCells = firstRow.querySelectorAll(
    "th:not(:first-child), td:not(:first-child)"
  );

  if (nonFirstCells.length === 0) return;

  // Reset all widths to measure natural widths
  rows.forEach((row) => {
    const cells = row.querySelectorAll(
      "th:not(:first-child), td:not(:first-child)"
    );
    cells.forEach((cell) => (cell.style.width = "auto"));
  });

  // Measure maximum width for each column
  const columnWidths = [];
  for (let i = 0; i < nonFirstCells.length; i++) {
    let maxWidth = 0;
    rows.forEach((row) => {
      const cells = row.querySelectorAll(
        "th:not(:first-child), td:not(:first-child)"
      );
      if (cells[i]) {
        maxWidth = Math.max(maxWidth, cells[i].offsetWidth);
      }
    });
    columnWidths.push(maxWidth);
  }

  // Apply maximum width to all columns
  const maxColumnWidth = Math.max(...columnWidths);
  rows.forEach((row) => {
    const cells = row.querySelectorAll(
      "th:not(:first-child), td:not(:first-child)"
    );
    cells.forEach((cell) => (cell.style.width = `${maxColumnWidth}px`));
  });
}

// =================================
// LEADERBOARD
// =================================

function populateLeaderboard(game, scores, showBestFinish) {
  if (scores === undefined) {
    scores = calcScores(game);
  }

  const leaders = game.players.map((player, i) => ({
    name: player.renderName,
    score: scores[i],
    best_finish: player.best_finish,
    max_margin: player.max_margin,
  }));

  // Sort by descending score
  leaders.sort((a, b) => b.score - a.score);

  const table = document.getElementById("leadertable");
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);

  createLeaderboardHeader(thead, showBestFinish);
  createLeaderboardRows(tbody, leaders, showBestFinish);
}

function createLeaderboardHeader(thead, showBestFinish) {
  const row = document.createElement("tr");

  const rankCell = document.createElement("th");
  rankCell.textContent = "#";
  rankCell.classList.add("text-center", "px-1");
  row.appendChild(rankCell);

  const nameCell = document.createElement("th");
  nameCell.textContent = "Name";
  nameCell.classList.add("text-center");
  row.appendChild(nameCell);

  const scoreCell = document.createElement("th");
  scoreCell.textContent = "Score";
  scoreCell.classList.add("text-center");
  row.appendChild(scoreCell);

  if (showBestFinish) {
    const bestCell = document.createElement("th");
    bestCell.classList.add("text-center");
    bestCell.textContent = "Best ";
    row.appendChild(bestCell);
  }

  thead.appendChild(row);
}

function createLeaderboardRows(tbody, leaders, showBestFinish) {
  let lastRank = -1;
  let lastScore = -1;

  leaders.forEach((leader, i) => {
    const rank = leader.score !== lastScore ? i + 1 : lastRank;
    lastRank = rank;
    lastScore = leader.score;

    const row = document.createElement("tr");

    const rankCell = document.createElement("td");
    rankCell.classList.add("text-center", "fw-bold", "small");
    rankCell.textContent = rank;
    row.appendChild(rankCell);

    const nameCell = document.createElement("td");
    nameCell.textContent = leader.name;
    nameCell.classList.add("px-5");
    row.appendChild(nameCell);

    const scoreCell = document.createElement("td");
    scoreCell.classList.add("text-center", "fw-bold");
    scoreCell.textContent = leader.score;
    row.appendChild(scoreCell);

    if (showBestFinish) {
      const bestCell = createBestFinishCell(leader);
      row.appendChild(bestCell);
    }

    tbody.appendChild(row);
  });
}

function createBestFinishCell(leader) {
  const cell = document.createElement("td");
  cell.classList.add("small", "text-center", "pl-2");
  cell.textContent = leader.best_finish;

  const sup = document.createElement("sup");
  sup.textContent = ordinalSuper(leader.best_finish);
  sup.classList.add("p-0");
  cell.appendChild(sup);

  const margin = document.createElement("span");
  margin.textContent =
    "(" + (leader.max_margin >= 0 ? "+" : "") + leader.max_margin + ")";
  cell.appendChild(margin);

  return cell;
}

// =================================
// SCORING
// =================================

function calcScores(game) {
  const scores = new Array(game.players.length).fill(0);
  const firstPlayoff = game.bowls.length - PREV_GAME[game.year].length;

  const getPoints = (bowlIndex, playerIndex) => {
    if (game.type === "basic") {
      return 1 + game.bowls[bowlIndex].bonus;
    }
    return (
      game.players[playerIndex].categories[bowlIndex] +
      game.bowls[bowlIndex].bonus
    );
  };

  game.bowls.forEach((bowl, i) => {
    if (bowl.result === null) return;

    let prevGames;
    if (i >= firstPlayoff) {
      const [relPrev0, relPrev1] = PREV_GAME[game.year][i - firstPlayoff];
      const prev0 = relPrev0 !== null ? relPrev0 + firstPlayoff : null;
      const prev1 = relPrev1 !== null ? relPrev1 + firstPlayoff : null;
      prevGames = [prev0, prev1];
    }

    game.players.forEach((player, j) => {
      if (player.picks[i] !== bowl.result) return;

      const isCorrect =
        i < firstPlayoff ||
        player.game_correct[prevGames[bowl.result] - firstPlayoff] !== false;
      if (isCorrect) {
        scores[j] += getPoints(i, j);
      }
    });
  });

  return scores;
}

// =================================
// UTILITIES
// =================================

function getRenderNames(names) {
  const renderNames = names.map((name) => name.split(" ")[0]);
  const lastNames = names.map((name) => " " + name.split(" ")[1]);

  for (let i = 0; i < renderNames.length; i++) {
    let nameOk = false;

    while (!nameOk) {
      nameOk = true;
      let origName = renderNames[i];
      for (let j = 0; j < renderNames.length; j++) {
        if (i == j) {
          continue;
        }

        if (origName == renderNames[j]) {
          if (nameOk) {
            renderNames[i] = origName + lastNames[i][0];
            lastNames[i] = lastNames[i].substring(1);
            nameOk = false;
          }

          renderNames[j] = origName + lastNames[j][0];
          lastNames[j] = lastNames[j].substring(1);
        }
      }
    }
  }
  return renderNames;
}

function ordinalSuper(num) {
  if (num === 1) return "st";
  if (num === 2) return "nd";
  if (num === 3) return "rd";
  return "th";
}

function addBestFinishPopup() {
  const popup = document.createElement("div");
  popup.setAttribute("class", "position-relative d-inline-block");
  popup.setAttribute("id", "bestpopup");
  popup.style.cursor = "pointer";

  popup.onclick = () => {
    document.getElementById("bestmsg").classList.toggle("d-none");
  };

  const svg = createQuestionMarkSVG();
  popup.appendChild(svg);

  const tooltip = document.createElement("span");
  tooltip.setAttribute(
    "class",
    "d-none position-absolute bg-dark text-white text-center rounded p-2"
  );
  tooltip.setAttribute("id", "bestmsg");
  tooltip.style.width = "260px";
  tooltip.style.top = "115%";
  tooltip.style.left = "100%";
  tooltip.style.zIndex = "1050";
  tooltip.textContent =
    "Shows each player's best possible final rank and how much they would win by (+) or lose by (-)";
  popup.appendChild(tooltip);

  document.getElementById("bestFinishPopup").appendChild(popup);
}

function createQuestionMarkSVG() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "10 10 80 80");

  // Magnifying glass circle and handle
  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "m68.699 60.301c3.5-5.1992 5.6016-11.398 5.6016-18.102 0-17.801-14.402-32.199-32.199-32.199-17.703 0-32.102 14.398-32.102 32.102 0 17.699 14.398 32.102 32.102 32.102 6.6992 0 12.898-2.1016 18.102-5.6016l19.602 19.602c1.1016 1.1016 2.6016 1.6992 4.1992 1.6992 1.6016 0 3.1016-0.60156 4.1992-1.6992 2.3008-2.3008 2.3008-6.1016 0-8.3984zm-26.598 10.898c-16 0-29.102-13-29.102-29.102 0-16 13-29.102 29.102-29.102 16 0 29.102 13 29.102 29.102-0.003906 16.102-13.004 29.102-29.102 29.102zm44 14.902c-1.1016 1.1016-3 1.1016-4.1016 0l-19.301-19.301c1.5-1.1992 2.8008-2.6016 4.1016-4.1016l19.301 19.301c1.0977 1.1016 1.0977 3 0 4.1016z"
  );
  svg.appendChild(path1);

  // Question mark top curve
  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "m42.102 25.102c-5 0-9.1016 4.1016-9.1016 9.1016 0 0.89844 0.69922 1.5 1.5 1.5 0.89844 0 1.5-0.69922 1.5-1.5 0-3.3008 2.6992-6.1016 6.1016-6.1016 1.6016 0 3.1016 0.60156 4.3008 1.8008 1.1992 1.1992 1.8008 2.6992 1.8008 4.3008 0 1.8984-0.89844 3.6016-2.3984 4.8008-3.3008 2.6016-5.1992 6.3008-5.1992 10.199v0.30078c0 0.89844 0.69922 1.5 1.5 1.5 0.89844 0 1.5-0.69922 1.5-1.5v-0.30078c0-3 1.5-5.8008 4-7.8008 2.3008-1.6992 3.6016-4.3984 3.6016-7.1992 0-2.3984-1-4.6992-2.6992-6.3984-1.707-1.7031-4.0078-2.7031-6.4062-2.7031z"
  );
  svg.appendChild(path2);

  // Question mark dot
  const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path3.setAttribute(
    "d",
    "m42.102 54.398c-1.3008 0-2.3984 1.1016-2.3984 2.3984 0 1.3984 1.1016 2.3984 2.3984 2.3984 1.3008 0 2.3984-1.1016 2.3984-2.3984 0-1.3984-1-2.3984-2.3984-2.3984z"
  );
  svg.appendChild(path3);

  return svg;
}

