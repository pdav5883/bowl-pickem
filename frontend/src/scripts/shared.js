import "../styles/custom.css";
import $ from "jquery";

import { API_URL } from "./constants.js";

import { initNavbar } from "blr-shared-frontend";

import { navbarConfig } from "../config/navbar-config.js";

export function populateMenu() {
  initNavbar(navbarConfig);
}

export function initCommon() {
  initNavbar(navbarConfig);
}

export function populateYears(defaultLatest) {
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

      // set to latest year
      // populateGameList() will be called on .change()
      if (defaultLatest) {
        $("#yearsel").val(yearOpt.value).change();
      }
    },
  });
}

export function populateGameList() {
  // need to clear options, or list will always grow
  $("#gamesel").empty();

  $.ajax({
    method: "GET",
    url: API_URL.primary,
    data: { qtype: "games", year: $("#yearsel").val() },
    crossDomain: true,
    success: function (res) {
      let game;

      Object.keys(res).forEach((gid) => {
        game = document.createElement("option");
        game.value = gid;
        game.textContent = gid.replace(/-/g, " ");
        $("#gamesel").append(game);
      });
    },
  });
}
