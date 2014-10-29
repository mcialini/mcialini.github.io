$(document).ready(function(){
    $("body").on("click touchend", "#mobile-nav li.top #inner-menu.shown", function() {
        $("#inner-menu").removeClass("shown");
        $("#inner-menu").addClass("hidden");
    });

    $("body").on("click touchend", "#mobile-nav li.top #inner-menu.hidden", function() {
        $("#inner-menu").removeClass("hidden");
        $("#inner-menu").addClass("shown");
    });
});