$(document).ready(function(){
    $("body").on("click touchend", "nav .mobile #menu-link", function(event) {
        event.stopPropagation();
        event.preventDefault();
        $("#inner-menu").toggle(250, function() {
            if ($("#inner-menu").is(":visible")) {
                $("#menu-link").text("CLOSE MENU");
            } else {
                $("#menu-link").text("MENU");
            }            
        });
        return false;
    });
});