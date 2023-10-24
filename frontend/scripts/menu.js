$(document).ready(function() {

  // Variables
  var $nav = $('.navbar'),
      $popoverLink = $('[data-popover]'),
      $document = $(document)

  function init() {
    $popoverLink.on('click', openPopover)
    $document.on('click', closePopover)
  }

  function openPopover(e) {
    e.preventDefault()
    closePopover();
    var popover = $($(this).data('popover'));
    popover.toggleClass('open')
    e.stopImmediatePropagation();
  }

  function closePopover(e) {
    if($('.popover.open').length > 0) {
      $('.popover').removeClass('open')
    }
  }

  init();
});

var navmenu =
'<ul class="navbar-list">' +
  '<li class="navbar-item"><a class="navbar-link" href="https://home.bearloves.rocks">Home</a></li>' +
  '<li class="navbar-item"><a class="navbar-link" href="/">Scoreboard</a></li>' +
  '<li class="navbar-item"><a class="navbar-link" href="/picks.html">Picks</a></li>' +
'</ul>';
