$(document).ready(function(){
    $("body").on("click", "#mobile-nav li.top", function() {
        $("#inner-menu").toggle(250);
    });
});