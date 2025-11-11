import "./constants.js"
import "../styles/custom.css"
import $ from "jquery"

import {
  initNavbar
} from "blr-shared-frontend";

import { navbarConfig } from "../config/navbar-config.js";

export function populateMenu() {
  initNavbar(navbarConfig)
}

export function initCommon() {
  initNavbar(navbarConfig)
}
