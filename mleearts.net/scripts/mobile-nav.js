$(document).ready(function(){
    $("body").on("click touchend", "#mobile-nav #menu-link", function() {
    	// alert("touched");
        $("#inner-menu").toggle(250);
        return false;
    });
});