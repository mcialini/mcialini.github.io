$(document).ready(function(){
    var ready = true;
    $("body").on("click touchend", "nav .mobile #menu-link", function(event) {
        if (ready === true) {
            ready = false;
            $("#inner-menu").toggle(250, function() {
                ready = true;
                if ($("#inner-menu").is(":visible")) {
                    $("#menu-link").text("CLOSE MENU");
                } else {
                    $("#menu-link").text("MENU");
                }         
            });
        }
        return false;
    });
});
$(document).bind(
      'touchmove',
          function(e) {
            e.preventDefault();
          }
);