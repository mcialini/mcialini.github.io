$(document).ready(function(){
    $("body").on("click touchend", "#mobile-nav li.top", function() {
        $("#inner-menu").toggle(1000);
    });
});