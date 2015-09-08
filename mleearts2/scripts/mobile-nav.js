$(document).ready(function(){
    $("body").on("click touchend", "nav .mobile #menu-link", function() {
        $("#inner-menu").toggle(250);
        return false;
    });
});